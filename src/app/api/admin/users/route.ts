import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user && (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN' || session.user.email === 'resumeforgeweb@gmail.com' || session.user.email === 'admin@gmail.com');
    if (!session || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        approvedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Admin creates a user directly (bypasses normal signup flow)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user && (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN' || session.user.email === 'resumeforgeweb@gmail.com' || session.user.email === 'admin@gmail.com');
    if (!session || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, password, role, status } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email, and password are required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || 'USER',
        status: status || 'APPROVED',
        approvedBy: session.user.id,
      },
    });

    return NextResponse.json(
      { message: 'User created successfully', user: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
