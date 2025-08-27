import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Server-side protection for /admin routes using a demo cookie written by the client-side login.
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  if (url.pathname.startsWith('/admin')) {
    const cookie = req.cookies.get('ladulcerina_auth')?.value;
    if (!cookie) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    try {
      const decoded = decodeURIComponent(cookie);
      const parsed = JSON.parse(decoded) as { role?: string };
      if (parsed.role !== 'admin') {
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }
    } catch (e) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
