import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeId, tailoredResumeId, resumeName } = await req.json();

    if (!resumeName?.trim()) {
      return NextResponse.json({ error: 'Resume name is required' }, { status: 400 });
    }

    // Save name on optimized resume
    if (resumeId) {
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId, userId: session.user.id },
      });
      if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });

      await prisma.resume.update({
        where: { id: resumeId },
        data: { resumeName: resumeName.trim() },
      });
    }

    // Save name on tailored resume
    if (tailoredResumeId) {
      const tailored = await prisma.tailoredResume.findUnique({
        where: { id: tailoredResumeId },
        include: { resume: true },
      });
      if (!tailored || tailored.resume.userId !== session.user.id) {
        return NextResponse.json({ error: 'Tailored resume not found' }, { status: 404 });
      }

      await prisma.tailoredResume.update({
        where: { id: tailoredResumeId },
        data: { resumeName: resumeName.trim() },
      });
    }

    return NextResponse.json({ message: 'Name saved successfully' });
  } catch (error) {
    console.error('Save name error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
