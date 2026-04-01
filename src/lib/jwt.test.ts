/**
 * Tests for src/lib/jwt.ts
 * Run: npx vitest src/lib/jwt.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32chars!!';
});

describe('JWT Access Token', () => {
  it('signAccessToken returns a string', () => {
    const token = signAccessToken({ userId: 'u1', role: 'TEACHER', email: 'test@example.com' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.sig
  });

  it('verifyAccessToken decodes valid token', () => {
    const token = signAccessToken({ userId: 'u1', role: 'TEACHER', email: 'a@b.com' });
    const payload = verifyAccessToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe('u1');
    expect(payload?.role).toBe('TEACHER');
    expect(payload?.email).toBe('a@b.com');
  });

  it('verifyAccessToken returns null for tampered token', () => {
    const token = signAccessToken({ userId: 'u1', role: 'TEACHER', email: 'a@b.com' });
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(verifyAccessToken(tampered)).toBeNull();
  });

  it('verifyAccessToken returns null for empty string', () => {
    expect(verifyAccessToken('')).toBeNull();
  });

  it('verifyAccessToken returns null for wrong secret token', () => {
    // Manually craft a token signed with wrong secret
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ4Iiwicm9sZSI6IkFETUlOIn0.bad_signature';
    expect(verifyAccessToken(fakeToken)).toBeNull();
  });
});

describe('JWT Refresh Token', () => {
  it('signRefreshToken returns a string', () => {
    const token = signRefreshToken({ userId: 'u2', role: 'STUDENT', email: 'student@school.vn' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyRefreshToken decodes valid token', () => {
    const token = signRefreshToken({ userId: 'u2', role: 'STUDENT', email: 's@s.com' });
    const payload = verifyRefreshToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe('u2');
    expect(payload?.role).toBe('STUDENT');
  });

  it('verifyRefreshToken returns null for access token (wrong secret)', () => {
    const accessToken = signAccessToken({ userId: 'u1', role: 'TEACHER', email: 'a@b.com' });
    // Refresh token uses different secret — access token should not verify as refresh token
    expect(verifyRefreshToken(accessToken)).toBeNull();
  });

  it('verifyAccessToken returns null for refresh token (wrong secret)', () => {
    const refreshToken = signRefreshToken({ userId: 'u1', role: 'ADMIN', email: 'a@b.com' });
    expect(verifyAccessToken(refreshToken)).toBeNull();
  });

  it('access and refresh tokens for same user are different', () => {
    const payload = { userId: 'u3', role: 'ADMIN' as const, email: 'admin@school.vn' };
    const access = signAccessToken(payload);
    const refresh = signRefreshToken(payload);
    expect(access).not.toBe(refresh);
  });
});

describe('JWT payload shape', () => {
  it('access token payload contains required fields', () => {
    const token = signAccessToken({ userId: 'u99', role: 'ADMIN', email: 'admin@test.com' });
    const payload = verifyAccessToken(token);
    expect(payload).toMatchObject({ userId: 'u99', role: 'ADMIN', email: 'admin@test.com' });
  });

  it('user roles are validated correctly', () => {
    const roles = ['ADMIN', 'TEACHER', 'STUDENT'] as const;
    for (const role of roles) {
      const token = signAccessToken({ userId: 'u1', role, email: 'u@school.vn' });
      const payload = verifyAccessToken(token);
      expect(payload?.role).toBe(role);
    }
  });
});
