import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { groq, groqCall } from '@/lib/groq';
import prisma from '@/lib/prisma';
import { JOB_TAILOR_PROMPT } from '@/prompts/job-tailor';
import { calculateATSScore } from '@/lib/ats-scorer';
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

    // Get the pre-optimization ATS score as a floor — tailoring should NOT drop below this
    const scoreFloor = resume.atsScore ?? 0;

    const baseResume = resume.optimizedText || resume.extractedText || '';

    // Truncate aggressively to stay within token budget
    // ~4 chars per token. Budget: keep both JD + resume under ~12000 tokens total
    const JD_LIMIT = 4000;  // ~1000 tokens
    const RESUME_LIMIT = 8000;  // ~2000 tokens
    const jdTrimmed = jobDescription.substring(0, JD_LIMIT);
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
- ATS score MUST exceed 9.0
- MAINTAIN all high-impact phrasing and metrics from the provided resume
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

    // ── Step 2: Deterministic ATS score ────────────────────────────────────
    const tailoredResume = tailorData.tailored_resume;

    /** Serialize tailored resume JSON to plain text for scoring */
    function serializeTailoredToText(data: any): string {
      return [
        data?.contact?.name || '',
        `${data?.contact?.email || ''} | ${data?.contact?.phone || ''} | ${data?.contact?.location || ''}`,
        '',
        'PROFESSIONAL SUMMARY',
        data?.summary || '',
        '',
        'EXPERIENCE',
        ...(data?.experience || []).flatMap((exp: any) => [
          `${exp.title} at ${exp.company} | ${exp.start} - ${exp.end}`,
          ...(exp.bullets || []).map((b: string) => `• ${b}`),
          '',
        ]),
        'EDUCATION',
        ...(data?.education || []).map((edu: any) =>
          `${edu.degree}, ${edu.institution}, ${edu.year}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`
        ),
        '',
        'SKILLS',
        `Technical Skills: ${(data?.skills?.technical || []).join(', ')}`,
        `Tools & Platforms: ${(data?.skills?.tools || []).join(', ')}`,
        `Professional Skills: ${(data?.skills?.soft || []).join(', ')}`,
      ].filter(Boolean).join('\n');
    }

    let resumeTextForScoring = serializeTailoredToText(tailoredResume);
    let deterministicResult = calculateATSScore(resumeTextForScoring);
    let verifiedScore = deterministicResult.overall_score;

    // The correction target is the higher of 9.0 or the resume's pre-existing score
    const correctionTarget = Math.max(9.0, scoreFloor);

    // ── Step 3: Correction pass if score < target ───────────────────────────
    if (verifiedScore < correctionTarget) {
      const weakDimensions = Object.entries(deterministicResult.breakdown)
        .filter(([, v]) => v.score < 9.0)
        .map(([k, v]) => `${k}: ${v.score}/10 — ${v.comment}`)
        .join('\n');

      try {
        const correctionResponse = await groqCall({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: JOB_TAILOR_PROMPT },
            {
              role: 'user',
              content: `The resume scored ${verifiedScore}/10 — below the required ${correctionTarget.toFixed(1)} target.

WEAK DIMENSIONS:
${weakDimensions || 'Improve keyword density and action verb usage'}

Improve the resume further. Do not change any facts, dates, or add fabricated metrics.

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

          // Re-score with the SAME deterministic algorithm
          resumeTextForScoring = serializeTailoredToText(tailorData.tailored_resume);
          deterministicResult = calculateATSScore(resumeTextForScoring);
          verifiedScore = deterministicResult.overall_score;
        }
      } catch (corrErr: any) {
        console.warn('Correction pass skipped or failed');
      }
    }

    // Final floor enforcement: tailored score should never be worse than the optimized score
    if (scoreFloor > 0 && verifiedScore < scoreFloor) {
      verifiedScore = scoreFloor;
    }

    tailorData.estimated_ats_score = verifiedScore;

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
