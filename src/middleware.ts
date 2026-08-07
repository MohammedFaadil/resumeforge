import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and API routes should not trigger the session cookie injector
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const cookieName = process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  const hasToken = request.cookies.has(cookieName);

  if (!hasToken) {
    // Generate mock token
    const token = await encode({
      token: {
        id: "mock-admin-id",
        name: "Admin User",
        email: "admin@gmail.com",
        role: "SUPER_ADMIN",
        status: "APPROVED",
      },
      secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_mock_session",
      maxAge: 30 * 24 * 60 * 60,
    });

    const response = NextResponse.redirect(request.url);
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  }

  // Redirect /login or /signup to /dashboard since they are implicitly logged in
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  if (isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
