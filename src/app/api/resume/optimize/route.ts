import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { groq, groqCall } from '@/lib/groq';
import prisma from '@/lib/prisma';
import { ATS_OPTIMIZE_PROMPT } from '@/prompts/ats-optimize';
import { calculateATSScore } from '@/lib/ats-scorer';

/** Strip any residual [SUGGESTED: ...] or [X%] or [NUMBER] placeholders from a string */
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

/** Recursively clean all string values in an object */
function deepClean(obj: any): any {
  if (typeof obj === 'string') return cleanPlaceholders(obj);
  if (Array.isArray(obj)) return obj.map(deepClean);
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) {
      cleaned[k] = deepClean(v);
    }
    return cleaned;
  }
  return obj;
}

/** Parse Groq 429 errors into user-friendly messages */
function parseGroqError(error: any): { isRateLimit: boolean; message: string } {
  const status = error?.status ?? error?.statusCode;
  if (status === 429) {
    const msg: string = error?.error?.error?.message || error?.message || '';
    const mins = msg.match(/(\d+)m/)?.[1];
    return {
      isRateLimit: true,
      message: `AI token limit reached for today. Please try again in ${mins ? `${mins} minute${mins === '1' ? '' : 's'}` : 'a few minutes'}.`,
    };
  }
  return { isRateLimit: false, message: error?.message || 'AI service error' };
}

/** Serialize a structured resume JSON to plain text for ATS scoring */
function serializeResumeToText(data: any): string {
  return [
    `${data.contact?.name || ''}`,
    `${data.contact?.email || ''} | ${data.contact?.phone || ''} | ${data.contact?.location || ''}`,
    data.contact?.linkedin ? `LinkedIn: ${data.contact.linkedin}` : '',
    '',
    'PROFESSIONAL SUMMARY',
    data.summary || '',
    '',
    'EXPERIENCE',
    ...(data.experience || []).flatMap((exp: any) => [
      `${exp.title} at ${exp.company} | ${exp.start} - ${exp.end}`,
      ...(exp.bullets || []).map((b: string) => `• ${b}`),
      '',
    ]),
    'EDUCATION',
    ...(data.education || []).map((edu: any) =>
      `${edu.degree}, ${edu.institution}, ${edu.year}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`
    ),
    '',
    'SKILLS',
    `Technical Skills: ${(data.skills?.technical || []).join(', ')}`,
    `Tools & Platforms: ${(data.skills?.tools || []).join(', ')}`,
    `Professional Skills: ${(data.skills?.soft || []).join(', ')}`,
  ].filter(Boolean).join('\n');
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeId } = await req.json();
    
    if (!resumeId) {
      return NextResponse.json({ error: 'Resume ID is required' }, { status: 400 });
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId, userId: session.user.id }
    });

    if (!resume || !resume.extractedText) {
      return NextResponse.json({ error: 'Valid resume not found' }, { status: 404 });
    }

    // ── Step 1: AI Optimization pass ─────────────────────────────────────────
    const response = await groqCall({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: ATS_OPTIMIZE_PROMPT },
        {
          role: 'user',
          content: `Optimize this resume for a high ATS score. 
        
CRITICAL REQUIREMENTS:
- Every bullet MUST start with a strong action verb
- Bullets must be 25-35 words each
- 4-5 bullets per experience entry minimum
- 3-sentence keyword-rich summary required
- Add all genuinely implied industry keywords
- Preserve ALL original dates, companies, titles exactly
- NO fabricated metrics, percentages, or achievements

RESUME TEXT:
${resume.extractedText.substring(0, 8000)}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 5000,
    });

    const responseContent = response.choices[0]?.message?.content || '';
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse JSON from AI response');

    let optimizedData = JSON.parse(jsonMatch[0]);
    optimizedData = deepClean(optimizedData);

    // ── Step 2: Deterministic ATS verification score ────────────────────────
    const resumeText = serializeResumeToText(optimizedData);
    let deterministicResult = calculateATSScore(resumeText);
    let verifiedScore = deterministicResult.overall_score;

    // ── Step 3: Correction pass if score < 9.0 ───────────────────────────
    if (verifiedScore < 9.0) {
      const weakDimensions = Object.entries(deterministicResult.breakdown)
        .filter(([, v]) => v.score < 9.0)
        .map(([k, v]) => `${k}: ${v.score}/10 — ${v.comment}`)
        .join('\n');

      try {
        const correctionResponse = await groqCall({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: ATS_OPTIMIZE_PROMPT },
            {
              role: 'user',
              content: `The optimized resume scored ${verifiedScore}/10 — below the required 9.0 target.

WEAK DIMENSIONS THAT NEED FIXING:
${weakDimensions || 'General keyword density and action verb usage need improvement'}

Improve the resume further to fix these weaknesses and achieve a higher score.

CURRENT OPTIMIZED RESUME (improve this, do NOT change any dates, companies, titles, or metrics):
${JSON.stringify(optimizedData, null, 2).substring(0, 10000)}

Return ONLY valid JSON in the same format.`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 7000,
        });

        const correctionContent = correctionResponse.choices[0]?.message?.content || '';
        const correctionMatch = correctionContent.match(/\{[\s\S]*\}/);
        if (correctionMatch) {
          const corrected = JSON.parse(correctionMatch[0]);
          optimizedData = deepClean(corrected);

          // Re-score with the SAME deterministic algorithm
          const finalResumeText = serializeResumeToText(optimizedData);
          deterministicResult = calculateATSScore(finalResumeText);
          verifiedScore = deterministicResult.overall_score;
        }
      } catch (corrErr: any) {
        console.warn('Correction pass failed:', corrErr?.message);
      }
    }

    // Save optimized JSON to database
    await prisma.resume.update({
      where: { id: resumeId },
      data: { optimizedText: JSON.stringify(optimizedData) }
    });

    return NextResponse.json({ 
      message: 'Optimization complete', 
      optimizedData,
      verifiedScore,
    });

  } catch (error) {
    console.error('Optimize handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
