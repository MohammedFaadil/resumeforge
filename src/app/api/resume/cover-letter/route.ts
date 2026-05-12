import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { groq, groqCall } from '@/lib/groq';
import prisma from '@/lib/prisma';

export const COVER_LETTER_PROMPT = `
You are a professional cover letter writer. Your job is to craft a compelling, personalized, and concise cover letter based solely on:
1. The candidate's REAL experience from their tailored resume
2. The specific job description they are applying for

════════════════════════════════════
COVER LETTER REQUIREMENTS
════════════════════════════════════
- Length: 3-4 tight paragraphs (no more, no less)
- Tone: Professional, confident, enthusiastic — NOT generic or robotic
- Structure:
  Paragraph 1: Opening hook — state the role, company name, and 1-2 most compelling reasons you're the right fit (draw from summary/experience)
  Paragraph 2: Highlight 2-3 specific accomplishments or skills from the resume that directly map to the JD requirements — use JD language
  Paragraph 3: Show genuine interest in the company/role — reference specific JD details (team, tech stack, mission)
  Paragraph 4: Confident close — express desire to discuss further, professional sign-off

════════════════════════════════════
STRICT RULES
════════════════════════════════════
- NEVER fabricate metrics, projects, or achievements not in the resume
- NEVER use generic filler like "I am a hardworking individual" or "I am passionate about..."
- Use the candidate's REAL name, specific role title, and company name
- Mirror keywords from the job description naturally
- Do not use "[Your Name]" or placeholder brackets anywhere
- Write in first person
- Start the letter body with "Dear Sir/Madam," on its own line
- End with a sign-off: "Sincerely,\n[Candidate Full Name]"
- Do NOT add a date line or formal letter header (just Dear Sir/Madam + body paragraphs + sign-off)

Return ONLY valid JSON, no markdown:
{
  "cover_letter": "Full cover letter text with paragraphs separated by \\n\\n",
  "subject_line": "Application for [Role Title] — [Candidate Name]",
  "key_selling_points": ["3-4 bullet points summarizing why this candidate fits this role"]
}
`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tailoredResumeId } = await req.json();

    if (!tailoredResumeId) {
      return NextResponse.json({ error: 'Tailored resume ID is required' }, { status: 400 });
    }

    const tailoredResume = await prisma.tailoredResume.findUnique({
      where: { id: tailoredResumeId },
      include: { resume: true },
    });

    if (!tailoredResume || tailoredResume.resume.userId !== session.user.id) {
      return NextResponse.json({ error: 'Tailored resume not found' }, { status: 404 });
    }

    const resumeData = tailoredResume.tailoredText
      ? JSON.parse(tailoredResume.tailoredText)
      : null;

    if (!resumeData) {
      return NextResponse.json({ error: 'No tailored resume data found' }, { status: 400 });
    }

    // Build a plain-text resume summary for the AI
    const candidateName = resumeData.contact?.name || 'the candidate';
    const candidateSummary = resumeData.summary || '';
    const topExperience = (resumeData.experience || []).slice(0, 2).map((exp: any) => ({
      title: exp.title,
      company: exp.company,
      bullets: (exp.bullets || []).slice(0, 3),
    }));
    const skills = [
      ...(resumeData.skills?.technical || []).slice(0, 8),
      ...(resumeData.skills?.tools || []).slice(0, 5),
    ].join(', ');

    const resumeContext = `
CANDIDATE NAME: ${candidateName}

PROFESSIONAL SUMMARY: ${candidateSummary}

TOP EXPERIENCE:
${topExperience.map((e: any) => `- ${e.title} at ${e.company}\n  ${e.bullets.map((b: string) => `  • ${b}`).join('\n  ')}`).join('\n')}

KEY SKILLS: ${skills}
`;

    const response = await groqCall({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: COVER_LETTER_PROMPT },
        {
          role: 'user',
          content: `Write a cover letter for this application:

APPLYING TO:
Company: ${tailoredResume.companyName || 'the company'}
Role: ${tailoredResume.jobTitle || 'the position'}

JOB DESCRIPTION:
${(tailoredResume.jobDescription || '').substring(0, 5000)}

CANDIDATE RESUME:
${resumeContext}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.45,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse cover letter response');

    const result = JSON.parse(jsonMatch[0]);

    const rawLetter: string = result.cover_letter || '';
    // Ensure letter always starts with "Dear Sir/Madam,"
    const greeting = 'Dear Sir/Madam,';
    const letterBody = rawLetter.startsWith(greeting)
      ? rawLetter
      : `${greeting}\n\n${rawLetter.replace(/^dear\s+(sir|madam|hiring\s+manager)[,.]?\s*/i, '')}`.trimStart();

    return NextResponse.json({
      coverLetter: letterBody,
      subjectLine: result.subject_line || '',
      keySellingPoints: result.key_selling_points || [],
    });

  } catch (error) {
    console.error('Cover letter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
