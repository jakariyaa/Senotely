import { NextResponse, type NextRequest } from 'next/server';
import { API_BASE_URL, TOKEN_COOKIE } from './lib/config';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL('/login', request.url));

  try {
    const response = await fetch(new URL('/users/me', API_BASE_URL), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      const redirect = NextResponse.redirect(new URL('/login', request.url));
      redirect.cookies.delete(TOKEN_COOKIE);
      return redirect;
    }
    if (request.nextUrl.pathname.startsWith('/admin/')) {
      const user = (await response.json()) as { role?: string };
      if (user.role !== 'admin') {
        return NextResponse.redirect(new URL('/notes', request.url));
      }
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = { matcher: ['/notes/:path*', '/admin/:path*'] };
