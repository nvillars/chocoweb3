import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth-edge';

// Server-side protection for /admin routes using a demo cookie written by the client-side login.
export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  if (url.pathname.startsWith('/admin')) {
    const token = req.cookies.get(process.env.SESSION_COOKIE_NAME || 'ld_session')?.value;
    if (!token) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    try {
  let payload: any = null;
  payload = await verifyToken(token);
  if (!payload) {
        // fallback: deny access if helper not available
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }
      if (!payload || payload.role !== 'admin') {
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
