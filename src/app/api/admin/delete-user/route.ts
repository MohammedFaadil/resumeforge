import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.email !== 'resumeforgeweb@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't delete the admin themselves
    if (user.email === 'resumeforgeweb@gmail.com') {
      return NextResponse.json({ error: 'Cannot delete the primary admin account' }, { status: 403 });
    }

    // Prisma relations (Resumes, Feedbacks) might need to be cascading, 
    // but if not explicitly set, we must delete child records first.
    // Let's delete them in a transaction.
    await prisma.$transaction([
      // Delete tailored resumes linked to resumes of this user
      prisma.tailoredResume.deleteMany({
        where: { resume: { userId } }
      }),
      // Delete resumes
      prisma.resume.deleteMany({
        where: { userId }
      }),
      // Delete feedbacks
      prisma.feedback.deleteMany({
        where: { userId }
      }),
      // Finally, delete the user
      prisma.user.delete({
        where: { id: userId }
      })
    ]);

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
