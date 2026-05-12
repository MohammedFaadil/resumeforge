import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isPendingRoute = pathname.startsWith('/pending');
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');
  const isProtectedRoute = isDashboardRoute || isAdminRoute;

  // 1. Not logged in → redirect to login if trying to access protected
  if (!token && isProtectedRoute) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // 2. Logged in → redirect away from auth pages to dashboard
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Logged in but PENDING/REJECTED → only allow /pending
  if (token && isProtectedRoute && token.status !== 'APPROVED') {
    if (!isPendingRoute) {
      return NextResponse.redirect(new URL('/pending', request.url));
    }
  }

  // 4. Already approved → don't let them sit on /pending
  if (token && isPendingRoute && token.status === 'APPROVED') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 5. Non-admin trying to access /admin
  if (token && isAdminRoute && token.role !== 'ADMIN' && token.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/pending',
  ],
};
