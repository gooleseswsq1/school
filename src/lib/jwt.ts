import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64').toString('utf8');
}

function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: return 0;
  }
}

function signHs256(unsignedToken: string, secret: string): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(unsignedToken)
    .digest();
  return base64UrlEncode(signature);
}

function createToken(payload: Record<string, unknown>, secret: string, expiresIn: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseDurationToSeconds(expiresIn);

  const finalPayload = {
    ...payload,
    iat: now,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(finalPayload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = signHs256(unsignedToken, secret);
  return `${unsignedToken}.${signature}`;
}

/**
 * Generate a short-lived access token (15 minutes)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return createToken({ ...payload, type: 'access' }, JWT_SECRET, '15m');
}

/**
 * Generate a long-lived refresh token (7 days)
 */
export function generateRefreshToken(payload: { userId: string }): string {
  return createToken({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, '7d');
}

/**
 * Verify and decode a token
 * @param token - Token to verify
 * @param type - 'access' or 'refresh'
 * @returns Decoded payload if valid, null if expired/invalid
 */
export function verifyToken(token: string, type: 'access' | 'refresh' = 'access'): JWTPayload | null {
  try {
    const secret = type === 'access' ? JWT_SECRET : JWT_REFRESH_SECRET;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSig = signHs256(unsignedToken, secret);
    if (expectedSig !== encodedSignature) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;
    if (payload.type && payload.type !== type) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a token without verification (useful for checking payload before expiry)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1])) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * Expected format: "Bearer <token>"
 */
export function extractTokenFromHeader(headerValue?: string | null): string | null {
  if (!headerValue) return null;
  const parts = headerValue.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}
