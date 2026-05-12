import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { groq, groqCall } from '@/lib/groq';
import prisma from '@/lib/prisma';
import { ATS_SCORE_PROMPT } from '@/prompts/ats-score';

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

    // Call Groq for ATS scoring
    const response = await groqCall({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: ATS_SCORE_PROMPT },
        {
          role: 'user',
          content: `Analyze this resume and return the scoring JSON:\n\n${resume.extractedText.substring(0, 10000)}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const responseContent = response.choices[0]?.message?.content || '';
    
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from AI scoring response");
    }

    const scoreData = JSON.parse(jsonMatch[0]);

    // Normalize breakdown: handle both legacy (plain number) and new ({score, max, comment}) formats
    if (scoreData.breakdown) {
      const normalized: Record<string, { score: number; max: number; comment: string }> = {};
      for (const [key, val] of Object.entries(scoreData.breakdown)) {
        if (typeof val === 'number') {
          // Legacy format — wrap it
          normalized[key] = { score: val as number, max: 10, comment: '' };
        } else if (val && typeof val === 'object' && 'score' in (val as object)) {
          normalized[key] = val as { score: number; max: number; comment: string };
        }
      }
      scoreData.breakdown = normalized;
    }

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
