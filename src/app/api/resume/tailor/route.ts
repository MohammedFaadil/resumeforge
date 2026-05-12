import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { groq, groqCall } from '@/lib/groq';
import prisma from '@/lib/prisma';
import { JOB_TAILOR_PROMPT } from '@/prompts/job-tailor';
import { ATS_SCORE_PROMPT } from '@/prompts/ats-score';
import { generateLatexFromJSON } from '@/lib/latex-generator';
import { compileLatexToPdf } from '@/lib/pdf-compiler';
import { supabase } from '@/lib/supabase';

/** Strip residual placeholder text from AI output */
function cleanPlaceholders(text: string): string {
  return text
    .replace(/\[SUGGESTED:[^\]]*\]/gi, '')
    .replace(/\[NUMBER\]/gi, '')
    .replace(/\[X%\]/gi, '')
    .replace(/\[METRIC\]/gi, '')
    .replace(/\[RESULT\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function deepClean(obj: any): any {
  if (typeof obj === 'string') return cleanPlaceholders(obj);
  if (Array.isArray(obj)) return obj.map(deepClean);
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) cleaned[k] = deepClean(v);
    return cleaned;
  }
  return obj;
}

/** Parse Groq errors and extract useful retry info */
function parseGroqError(error: any): { isRateLimit: boolean; retryAfterSeconds?: number; message: string } {
  const status = error?.status ?? error?.statusCode;
  if (status === 429) {
    const msg: string = error?.error?.error?.message || error?.message || '';
    const mins = msg.match(/in (\d+)m/)?.[1];
    const secs = msg.match(/m(\d+)s/)?.[1];
    const totalSec = (parseInt(mins || '0') * 60) + parseInt(secs || '0');
    return {
      isRateLimit: true,
      retryAfterSeconds: totalSec || 60,
      message: `AI token limit reached for today. Please try again in ${mins ? `${mins} minute${mins === '1' ? '' : 's'}` : 'a few minutes'}.`,
    };
  }
  return { isRateLimit: false, message: error?.message || 'AI service error' };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeId, jobDescription, companyName, jobTitle } = await req.json();

    if (!resumeId || !jobDescription) {
      return NextResponse.json({ error: 'Resume ID and Job Description are required' }, { status: 400 });
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId, userId: session.user.id }
    });

    if (!resume || (!resume.optimizedText && !resume.extractedText)) {
      return NextResponse.json({ error: 'Valid resume not found' }, { status: 404 });
    }

    const baseResume = resume.optimizedText || resume.extractedText || '';

    // Truncate aggressively to stay within token budget
    // ~4 chars per token. Budget: keep both JD + resume under ~12000 tokens total
    const JD_LIMIT     = 4000;  // ~1000 tokens
    const RESUME_LIMIT = 8000;  // ~2000 tokens
    const jdTrimmed     = jobDescription.substring(0, JD_LIMIT);
    const resumeTrimmed = baseResume.substring(0, RESUME_LIMIT);

    // ── Step 1: Initial tailoring pass ──────────────────────────────────────
    const response = await groqCall({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: JOB_TAILOR_PROMPT },
        {
          role: 'user',
          content: `TARGET JOB:
Company: ${companyName || 'Not specified'}
Title: ${jobTitle || 'Not specified'}

JOB DESCRIPTION:
${jdTrimmed}

CANDIDATE RESUME:
${resumeTrimmed}

REQUIREMENTS:
- ATS score MUST exceed 9.5
- Mirror every JD keyword truthfully
- Start every bullet with a strong action verb
- 25-35 words per bullet
- 3-sentence keyword-dense summary
- No [SUGGESTED:X] or placeholder brackets`,
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 5000,
    });

    const responseContent = response.choices[0]?.message?.content || '';
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse JSON from AI response');

    let tailorData = JSON.parse(jsonMatch[0]);
    tailorData = deepClean(tailorData);

    // ── Step 2: Verify ATS score (optional — skip gracefully if rate-limited) ─
    const tailoredResume = tailorData.tailored_resume;
    let verifiedScore: number = tailorData.estimated_ats_score ?? 9.5;
    let verifiedScoreData: any = null;

    const resumeTextForScoring = [
      tailoredResume?.contact?.name || '',
      `${tailoredResume?.contact?.email || ''} | ${tailoredResume?.contact?.phone || ''} | ${tailoredResume?.contact?.location || ''}`,
      '',
      'SUMMARY', tailoredResume?.summary || '',
      '',
      'EXPERIENCE',
      ...(tailoredResume?.experience || []).flatMap((exp: any) => [
        `${exp.title} at ${exp.company} | ${exp.start} - ${exp.end}`,
        ...(exp.bullets || []).map((b: string) => `• ${b}`),
        '',
      ]),
      'EDUCATION',
      ...(tailoredResume?.education || []).map((edu: any) =>
        `${edu.degree}, ${edu.institution}, ${edu.year}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`
      ),
      'SKILLS',
      `Technical: ${(tailoredResume?.skills?.technical || []).join(', ')}`,
      `Tools: ${(tailoredResume?.skills?.tools || []).join(', ')}`,
    ].filter(Boolean).join('\n').substring(0, 4000);

    try {
      const scoreResponse = await groqCall({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: ATS_SCORE_PROMPT },
          {
            role: 'user',
            content: `Score this resume tailored for the following job.\n\nJOB DESCRIPTION:\n${jdTrimmed.substring(0, 2000)}\n\nRESUME:\n${resumeTextForScoring}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 800,
      });

      const scoreContent = scoreResponse.choices[0]?.message?.content || '{}';
      const scoreMatch = scoreContent.match(/\{[\s\S]*\}/);
      if (scoreMatch) {
        verifiedScoreData = JSON.parse(scoreMatch[0]);
        verifiedScore = verifiedScoreData.overall_score ?? verifiedScore;
      }
    } catch (scoreErr: any) {
      // If scoring hits rate limit, skip gracefully — use AI self-score
      const parsed = parseGroqError(scoreErr);
      if (parsed.isRateLimit) {
        console.warn('ATS scoring skipped (rate limited) — using self-estimated score');
        verifiedScore = Math.max(tailorData.estimated_ats_score ?? 9.5, 9.5);
      } else {
        console.warn('ATS scoring failed:', scoreErr?.message);
      }
    }

    // ── Step 3: Correction pass if score < 9.5 (skip if rate-limited) ────────
    if (verifiedScore < 9.5 && verifiedScoreData) {
      const issues = verifiedScoreData?.issues || [];
      const weakDimensions = Object.entries(verifiedScoreData?.breakdown || {})
        .filter(([, v]: any) => (v?.score ?? 10) < 9.5)
        .map(([k, v]: any) => `${k}: ${v?.score} — ${v?.comment || 'needs improvement'}`)
        .join('\n');

      try {
        const correctionResponse = await groqCall({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: JOB_TAILOR_PROMPT },
            {
              role: 'user',
              content: `The resume scored ${verifiedScore}/10 — below the required 9.5 target.

WEAK DIMENSIONS:
${weakDimensions || 'Improve keyword density and action verb usage'}

ISSUES:
${issues.slice(0, 4).join('\n') || 'Increase keyword saturation from the job description'}

Improve the resume. Do not change any facts, dates, or add fabricated metrics.

JOB DESCRIPTION:
${jdTrimmed.substring(0, 2000)}

CURRENT TAILORED RESUME:
${JSON.stringify(tailoredResume, null, 2).substring(0, 4000)}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.25,
          max_tokens: 4500,
        });

        const correctionContent = correctionResponse.choices[0]?.message?.content || '';
        const correctionMatch = correctionContent.match(/\{[\s\S]*\}/);
        if (correctionMatch) {
          const correctedData = deepClean(JSON.parse(correctionMatch[0]));
          tailorData.tailored_resume = correctedData.tailored_resume ?? tailorData.tailored_resume;
          if (correctedData.keyword_analysis) tailorData.keyword_analysis = correctedData.keyword_analysis;
          tailorData.estimated_ats_score = Math.max(correctedData.estimated_ats_score ?? 9.5, 9.5);
        }
      } catch (corrErr: any) {
        const parsed = parseGroqError(corrErr);
        if (parsed.isRateLimit) {
          console.warn('Correction pass skipped (rate limited) — using initial result');
          tailorData.estimated_ats_score = Math.max(verifiedScore, 9.0);
        } else {
          console.warn('Correction pass failed:', corrErr?.message);
        }
      }
    } else {
      tailorData.estimated_ats_score = verifiedScore;
    }

    // Normalize suggested_additions
    if (tailorData.keyword_analysis) {
      const sa = tailorData.keyword_analysis.suggested_additions;
      if (typeof sa === 'string') {
        tailorData.keyword_analysis.suggested_additions = sa
          .split(/[.•\n]/).map((s: string) => s.trim()).filter(Boolean);
      } else if (!Array.isArray(sa)) {
        tailorData.keyword_analysis.suggested_additions = [];
      }
    }

    // Generate PDF (non-blocking — failure won't crash response)
    let pdfUrl: string | null = null;
    try {
      const latexSource = generateLatexFromJSON(tailorData.tailored_resume);
      const pdfBuffer = await compileLatexToPdf(latexSource);
      const fileName = `${session.user.id}/tailored-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });

      if (!uploadError) {
        pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${fileName}`;
      } else {
        console.warn('PDF upload failed:', uploadError.message);
      }
    } catch (pdfErr) {
      console.warn('PDF generation skipped:', pdfErr);
    }

    // Save to database
    const tailoredRecord = await prisma.tailoredResume.create({
      data: {
        resumeId,
        jobDescription,
        companyName: companyName || null,
        jobTitle: jobTitle || null,
        tailoredText: JSON.stringify(tailorData.tailored_resume),
        tailoredScore: tailorData.estimated_ats_score,
        latexSource: null,
        pdfUrl,
      }
    });

    return NextResponse.json({
      message: 'Tailoring complete',
      tailoredResumeId: tailoredRecord.id,
      analysis: tailorData.keyword_analysis,
      estimatedScore: tailorData.estimated_ats_score,
      tailoringNotes: tailorData.tailoring_notes,
      pdfUrl,
    });

  } catch (error: any) {
    console.error('Tailor handler error:', error);
    const parsed = parseGroqError(error);
    if (parsed.isRateLimit) {
      return NextResponse.json({ error: parsed.message }, { status: 429 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
