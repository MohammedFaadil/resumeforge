import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars (without exposing secrets)
  checks['NEXTAUTH_URL'] = process.env.NEXTAUTH_URL || 'NOT SET';
  checks['NEXTAUTH_SECRET'] = process.env.NEXTAUTH_SECRET ? 'SET ✓' : 'NOT SET ✗';
  checks['DATABASE_URL'] = process.env.DATABASE_URL ? 'SET ✓' : 'NOT SET ✗';
  checks['NODE_ENV'] = process.env.NODE_ENV || 'unknown';

  // Check DB connection
  try {
    const userCount = await prisma.user.count();
    checks['DB_CONNECTION'] = 'OK ✓';
    checks['USER_COUNT'] = String(userCount);

    const admin = await prisma.user.findFirst({
      where: {
        email: { in: ['resumeforgeweb@gmail.com', 'admin@gmail.com'] }
      },
      select: { email: true, role: true, status: true },
    });
    checks['ADMIN_EXISTS'] = admin ? `YES — ${admin.email} (${admin.role}, ${admin.status})` : 'NO ADMIN FOUND';
  } catch (err: any) {
    checks['DB_CONNECTION'] = `FAILED ✗ — ${err.message}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
