import { NextRequest, NextResponse } from 'next/server';

function hasValidLocalSession(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  const authCookie = cookies.find((c) => c.name.includes('-auth-token'));
  if (!authCookie || !authCookie.value) return false;

  try {
    let raw = authCookie.value;
    if (raw.startsWith('base64-')) {
      raw = Buffer.from(raw.slice(7), 'base64').toString('utf-8');
    }
    if (raw.startsWith('{') || raw.startsWith('[')) {
      const parsed = JSON.parse(raw);
      const token = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || parsed[0]);
      if (token && typeof token === 'string' && token.includes('.')) {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
        return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
      }
    } else if (raw.includes('.')) {
      const payload = JSON.parse(Buffer.from(raw.split('.')[1], 'base64').toString('utf-8'));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    }
    return true; // Fallback: cookie exists with non-empty auth token
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAuth = hasValidLocalSession(request);

  // Protected app routes
  const protectedPrefixes = ['/home', '/sell', '/stock', '/debts', '/reports', '/settings', '/onboarding'];
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !isAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // If logged in and visiting landing or auth pages, redirect to /home
  if (isAuth && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline|icons|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
