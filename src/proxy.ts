import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // Allow login page, API auth routes, and cron endpoint (uses its own bearer token)
  if (pathname === '/login' || pathname.startsWith('/api/auth') || pathname === '/api/cron') {
    // If already logged in and visiting /login, redirect to dashboard
    if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes: just check cookie exists
  // (actual JWT verification happens in API routes via getCurrentUser)
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
