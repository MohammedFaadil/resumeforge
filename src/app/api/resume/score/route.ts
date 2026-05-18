import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { groqCall } from '@/lib/groq';
import prisma from '@/lib/prisma';
import { calculateATSScore } from '@/lib/ats-scorer';

/**
 * ATS Score API
 * 
 * Uses a DETERMINISTIC algorithmic scorer for numeric scores, and the
 * LLM only for qualitative feedback (summary, strengths, issues).
 * This guarantees that re-uploading the same PDF always shows the same score.
 */

const FEEDBACK_PROMPT = `You are an ATS resume expert. Given a resume and its pre-calculated scores, provide qualitative feedback ONLY.

IMPORTANT: Do NOT calculate or suggest any numeric scores. The scores have already been calculated by a separate system. Your job is ONLY to provide the qualitative text fields.

Return JSON in this exact format:
{
  "summary": "A blunt 1-sentence assessment of the resume's ATS readiness.",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "issues": ["issue 1", "issue 2"]
}`;

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

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    if (!resume.extractedText) {
      return NextResponse.json({ error: 'No text extracted from this resume yet' }, { status: 400 });
    }

    // ── Step 1: Deterministic algorithmic scoring (always consistent) ──────
    const deterministicResult = calculateATSScore(resume.extractedText);

    // ── Step 2: AI-generated qualitative feedback (non-blocking) ───────────
    let summary = 'Resume analyzed successfully.';
    let strengths: string[] = [];
    let issues: string[] = [];

    try {
      const response = await groqCall({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: FEEDBACK_PROMPT },
          {
            role: 'user',
            content: `Here is the resume text and its pre-calculated ATS scores. Provide qualitative feedback only.

PRE-CALCULATED SCORES:
- Overall: ${deterministicResult.overall_score}/10
- Keyword Density: ${deterministicResult.breakdown.keyword_density.score}/10 — ${deterministicResult.breakdown.keyword_density.comment}
- Action Verb Usage: ${deterministicResult.breakdown.action_verb_usage.score}/10 — ${deterministicResult.breakdown.action_verb_usage.comment}
- Impact & Accomplishments: ${deterministicResult.breakdown.impact_accomplishments.score}/10 — ${deterministicResult.breakdown.impact_accomplishments.comment}
- Formatting & Structure: ${deterministicResult.breakdown.formatting_structure.score}/10 — ${deterministicResult.breakdown.formatting_structure.comment}
- Section Completeness: ${deterministicResult.breakdown.section_completeness.score}/10 — ${deterministicResult.breakdown.section_completeness.comment}

RESUME TEXT:
${resume.extractedText.substring(0, 6000)}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const responseContent = response.choices[0]?.message?.content || '';
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const feedbackData = JSON.parse(jsonMatch[0]);
        summary = feedbackData.summary || summary;
        strengths = feedbackData.strengths || strengths;
        issues = feedbackData.issues || issues;
      }
    } catch (feedbackErr) {
      // If AI feedback fails (rate limit, etc.), we still have the deterministic scores
      console.warn('AI feedback generation failed, using algorithmic comments:', feedbackErr);
      
      // Fall back to algorithmic comments
      summary = `Resume scored ${deterministicResult.overall_score}/10 for ATS compatibility.`;
      strengths = Object.values(deterministicResult.breakdown)
        .filter(d => d.score >= 8.5)
        .map(d => d.comment);
      issues = Object.values(deterministicResult.breakdown)
        .filter(d => d.score < 8)
        .map(d => d.comment);
    }

    // Build final scoreData in the same shape the frontend expects
    const scoreData = {
      overall_score: deterministicResult.overall_score,
      summary,
      breakdown: deterministicResult.breakdown,
      strengths,
      issues,
    };

    // Save score to database
    await prisma.resume.update({
      where: { id: resumeId },
      data: { atsScore: scoreData.overall_score }
    });

    return NextResponse.json({ 
      message: 'Scoring complete', 
      scoreData
    });

  } catch (error) {
    console.error('Score handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
