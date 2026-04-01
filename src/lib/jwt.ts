import jwt from 'jsonwebtoken';

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

/**
 * Generate a short-lived access token (15 minutes)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });
}

/**
 * Generate a long-lived refresh token (7 days)
 */
export function generateRefreshToken(payload: { userId: string }): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
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
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a token without verification (useful for checking payload before expiry)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
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
