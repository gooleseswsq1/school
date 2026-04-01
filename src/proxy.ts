import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Protected routes that require JWT authentication
const protectedRoutes = [
  '/api/teacher/',
  '/api/admin/',
  '/api/pages',
  '/api/exams',
  '/api/quiz',
  '/api/exam-banks',
  '/api/documents',
  '/api/upload',
  '/api/comments',
  '/api/library',
  '/api/jobs',
];

// Public routes that don't need authentication
const publicRoutes = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/register',
  '/api/health',
];

// Rate limiting via in-memory store (Edge-safe, per instance)
// Full Redis rate limiting is handled inside each API route
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= limit) {
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Basic in-memory rate limit for auth endpoints (5/minute per IP)
  const isAuthRoute = pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register');
  if (isAuthRoute) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = `auth:${ip}`;
    const allowed = inMemoryRateLimit(key, 5, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // Public routes — no auth needed
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Non-API and non-protected routes — pass through
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // --- JWT Validation (Edge-compatible via jose) ---
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Also check cookie-based access token
  if (!token) {
    token = request.cookies.get('access_token')?.value ?? null;
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: No token provided' },
      { status: 401 }
    );
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
    );

    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    // Validate token type
    if (payload.type !== 'access') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid token type' },
        { status: 401 }
      );
    }

    // Attach user info to request headers for use in route handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(payload.userId ?? ''));
    requestHeaders.set('x-user-role', String(payload.role ?? ''));
    requestHeaders.set('x-user-email', String(payload.email ?? ''));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or expired token' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
