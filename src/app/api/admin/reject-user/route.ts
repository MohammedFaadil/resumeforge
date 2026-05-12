import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Prevent rejecting yourself
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot reject your own account' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'REJECTED' },
    });

    return NextResponse.json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error('Reject user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
