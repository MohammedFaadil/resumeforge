import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateLatexFromJSON } from '@/lib/latex-generator';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeId, resumeData } = await req.json();

    if (!resumeId || !resumeData) {
      return NextResponse.json({ error: 'Resume ID and data are required' }, { status: 400 });
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId, userId: session.user.id }
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Store the edited resume as optimizedText JSON
    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        optimizedText: JSON.stringify(resumeData),
      }
    });

    return NextResponse.json({ message: 'Resume saved successfully' });
  } catch (error) {
    console.error('Save edit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
