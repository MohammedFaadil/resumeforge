import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeId } = await req.json();
    if (!resumeId) {
      return NextResponse.json({ error: 'resumeId is required' }, { status: 400 });
    }

    const isAdmin = session.user.email === 'resumeforgeweb@gmail.com';

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Regular users can only delete their own resumes
    if (!isAdmin && resume.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete tailored children first, then the parent
    await prisma.tailoredResume.deleteMany({ where: { resumeId } });
    await prisma.resume.delete({ where: { id: resumeId } });

    return NextResponse.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
