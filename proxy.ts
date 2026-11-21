import { NextRequest, NextResponse } from 'next/server';

function hasValidLocalSession(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  if (!cookies || cookies.length === 0) return false;

  // Collect potential auth cookie prefixes (e.g. sb-<project>-auth-token, supabase-auth-token)
  const authPrefixes = new Set<string>();
  for (const c of cookies) {
    if (c.name.includes('-auth-token') || c.name.includes('access-token') || c.name.startsWith('sb-')) {
      const base = c.name.replace(/\.\d+$/, '');
      authPrefixes.add(base);
    }
  }

  for (const base of authPrefixes) {
    // Reassemble chunked cookies (.0, .1, etc.) or read single cookie
    const chunks: { index: number; value: string }[] = [];
    for (const c of cookies) {
      if (c.name === base) {
        chunks.push({ index: 0, value: c.value });
      } else if (c.name.startsWith(`${base}.`)) {
        const idx = parseInt(c.name.slice(base.length + 1), 10);
        if (!isNaN(idx)) {
          chunks.push({ index: idx, value: c.value });
        }
      }
    }

    if (chunks.length === 0) continue;
    chunks.sort((a, b) => a.index - b.index);
    const combinedValue = chunks.map((c) => c.value).join('');
    if (!combinedValue) continue;

    try {
      let raw = combinedValue;
      if (raw.startsWith('base64-')) {
        raw = Buffer.from(raw.slice(7), 'base64').toString('utf-8');
      }

      if (raw.startsWith('{') || raw.startsWith('[')) {
        const parsed = JSON.parse(raw);
        // Supabase SSR session format: array with access_token or object with access_token
        const token = Array.isArray(parsed)
          ? typeof parsed[0] === 'string'
            ? parsed[0]
            : parsed[0]?.access_token
          : parsed.access_token || parsed[0];

        if (token && typeof token === 'string' && token.includes('.')) {
          const parts = token.split('.');
          if (parts[1]) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (typeof payload.exp === 'number') {
              if (payload.exp * 1000 > Date.now()) {
                return true;
              }
              // Expired session
              continue;
            }
          }
        }
      } else if (raw.includes('.')) {
        const parts = raw.split('.');
        if (parts[1]) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (typeof payload.exp === 'number') {
            if (payload.exp * 1000 > Date.now()) {
              return true;
            }
            continue;
          }
        }
      }

      // Valid session structure identified
      if (combinedValue.length > 20) {
        return true;
      }
    } catch {
      if (combinedValue.length > 30) {
        return true;
      }
    }
  }

  return false;
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
