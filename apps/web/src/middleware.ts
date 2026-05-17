import { NextRequest, NextResponse } from 'next/server';

/**
 * Routes that do NOT require authentication.
 * All other matched routes will redirect unauthenticated users to /login.
 */
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Prefix-based public routes (startsWith check).
 */
const PUBLIC_PREFIXES = ['/verify-email/', '/api/auth/'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without auth check
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for the httpOnly accessToken cookie set by the backend
  const accessToken = request.cookies.get('accessToken')?.value;

  // Also check the NextAuth session token as a fallback (supports both auth flows)
  const nextAuthToken =
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!accessToken && !nextAuthToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/go/:path*'],
};
