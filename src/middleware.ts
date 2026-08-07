import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
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

  // 3. Non-admin trying to access /admin
  const isAdmin = token && (token.role === 'SUPER_ADMIN' || token.role === 'ADMIN' || token.email === 'resumeforgeweb@gmail.com' || token.email === 'admin@gmail.com');
  if (token && isAdminRoute && !isAdmin) {
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
  ],
};
