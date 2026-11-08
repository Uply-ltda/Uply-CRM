import { NextResponse } from 'next/server';
import { COOKIE_NAME, verifyJwtToken, clearAuthCookie } from './lib/auth';

const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/logout'];

function applySecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    return applySecurityHeaders(NextResponse.next());
  }

  const authHeader = request.headers.get('authorization');
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value || null;
  const rawToken = bearerToken || cookieToken;

  if (!rawToken) {
    const res = NextResponse.json(
      { error: 'Sessão não autenticada. Faça login para continuar.', forceLogout: true },
      { status: 401 }
    );
    return applySecurityHeaders(clearAuthCookie(res));
  }

  const payload = await verifyJwtToken(rawToken);
  if (!payload || !payload.sub || !payload.sessionToken) {
    const res = NextResponse.json(
      { error: 'Token de sessão inválido ou expirado. Faça login novamente.', forceLogout: true },
      { status: 401 }
    );
    return applySecurityHeaders(clearAuthCookie(res));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/api/:path*'],
};

