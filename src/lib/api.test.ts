/**
 * Tests for API utilities: rate limiting, cache helpers, auth helpers
 * Run: npx vitest src/lib/api.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────────────────────
// Test: Rate Limit logic (in-memory token bucket)
// ──────────────────────────────────────────────────────────────

describe('Rate limit token bucket', () => {
  const createBucket = (maxRPM: number) => {
    const requests: number[] = [];
    return {
      check: () => {
        const now = Date.now();
        const windowMs = 60_000;
        // Remove old entries outside window
        while (requests.length > 0 && requests[0] < now - windowMs) {
          requests.shift();
        }
        if (requests.length >= maxRPM) {
          return { allowed: false, remaining: 0 };
        }
        requests.push(now);
        return { allowed: true, remaining: maxRPM - requests.length };
      },
      reset: () => { requests.length = 0; },
    };
  };

  it('allows requests up to limit', () => {
    const bucket = createBucket(3);
    expect(bucket.check().allowed).toBe(true);
    expect(bucket.check().allowed).toBe(true);
    expect(bucket.check().allowed).toBe(true);
  });

  it('blocks request that exceeds limit', () => {
    const bucket = createBucket(2);
    bucket.check();
    bucket.check();
    const result = bucket.check();
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('remaining count decreases correctly', () => {
    const bucket = createBucket(5);
    const first = bucket.check();
    expect(first.remaining).toBe(4);
    const second = bucket.check();
    expect(second.remaining).toBe(3);
  });

  it('allows requests after reset', () => {
    const bucket = createBucket(1);
    bucket.check();
    expect(bucket.check().allowed).toBe(false);
    bucket.reset();
    expect(bucket.check().allowed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// Test: Password validation rules
// ──────────────────────────────────────────────────────────────

describe('Password validation', () => {
  const validatePassword = (pw: string) => {
    if (pw.length < 6) return { valid: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
    if (pw.length > 100) return { valid: false, error: 'Mật khẩu tối đa 100 ký tự' };
    return { valid: true, error: null };
  };

  it('accepts valid password', () => {
    expect(validatePassword('abc123').valid).toBe(true);
  });

  it('rejects password shorter than 6 chars', () => {
    const result = validatePassword('12345');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('6');
  });

  it('rejects empty password', () => {
    expect(validatePassword('').valid).toBe(false);
  });

  it('accepts password exactly 6 chars', () => {
    expect(validatePassword('abcdef').valid).toBe(true);
  });

  it('rejects password over 100 chars', () => {
    expect(validatePassword('x'.repeat(101)).valid).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// Test: Email validation
// ──────────────────────────────────────────────────────────────

describe('Email validation', () => {
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());

  it('accepts valid emails', () => {
    expect(isValidEmail('teacher@school.edu.vn')).toBe(true);
    expect(isValidEmail('student123@gmail.com')).toBe(true);
    expect(isValidEmail('admin@penta.vn')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('missing@dot')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// Test: Cache key generation
// ──────────────────────────────────────────────────────────────

describe('Cache key helpers', () => {
  const keys = {
    page: (id: string) => `page:${id}`,
    pageList: (userId: string) => `pages:user:${userId}`,
    exam: (id: string) => `exam:${id}`,
    examResults: (examId: string, userId: string) => `exam:results:${examId}:${userId}`,
    session: (token: string) => `session:${token}`,
    rateLimit: (ip: string, route: string) => `rate:${ip}:${route}`,
  };

  it('generates page key correctly', () => {
    expect(keys.page('abc123')).toBe('page:abc123');
  });

  it('generates page list key correctly', () => {
    expect(keys.pageList('user1')).toBe('pages:user:user1');
  });

  it('generates exam results key correctly', () => {
    expect(keys.examResults('exam1', 'user2')).toBe('exam:results:exam1:user2');
  });

  it('generates rate limit key with ip and route', () => {
    expect(keys.rateLimit('127.0.0.1', '/api/auth/login')).toBe('rate:127.0.0.1:/api/auth/login');
  });

  it('different users produce different page list keys', () => {
    expect(keys.pageList('user1')).not.toBe(keys.pageList('user2'));
  });
});

// ──────────────────────────────────────────────────────────────
// Test: RBAC role hierarchy
// ──────────────────────────────────────────────────────────────

describe('RBAC role hierarchy', () => {
  type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
  const ROLE_HIERARCHY: Record<Role, number> = { ADMIN: 3, TEACHER: 2, STUDENT: 1 };

  const hasMinRole = (userRole: Role, minRole: Role): boolean =>
    ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];

  it('ADMIN has access to all routes', () => {
    expect(hasMinRole('ADMIN', 'STUDENT')).toBe(true);
    expect(hasMinRole('ADMIN', 'TEACHER')).toBe(true);
    expect(hasMinRole('ADMIN', 'ADMIN')).toBe(true);
  });

  it('TEACHER has access to teacher and student routes', () => {
    expect(hasMinRole('TEACHER', 'STUDENT')).toBe(true);
    expect(hasMinRole('TEACHER', 'TEACHER')).toBe(true);
    expect(hasMinRole('TEACHER', 'ADMIN')).toBe(false);
  });

  it('STUDENT only has access to student routes', () => {
    expect(hasMinRole('STUDENT', 'STUDENT')).toBe(true);
    expect(hasMinRole('STUDENT', 'TEACHER')).toBe(false);
    expect(hasMinRole('STUDENT', 'ADMIN')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// Test: Request sanitization
// ──────────────────────────────────────────────────────────────

describe('Input sanitization', () => {
  // Simple HTML tag stripper — removes tags but NOT between-tag content
  // For full XSS protection, use DOMPurify in browser or sanitize-html on server
  const stripHtmlTags = (input: string) =>
    input.replace(/<[^>]*>/g, '').trim();

  it('strips opening and closing HTML tags, leaves text content', () => {
    // <script> tags are stripped; script content remains — use DOMPurify for full XSS protection
    const stripped = stripHtmlTags('<script>alert("xss")</script>hello');
    expect(stripped).not.toContain('<script>');
    expect(stripped).not.toContain('</script>');
    expect(stripped).toContain('hello');
  });

  it('allows normal text unchanged', () => {
    expect(stripHtmlTags('Toán 10 - Chương 1')).toBe('Toán 10 - Chương 1');
  });

  it('strips multiple tags leaving inner text', () => {
    expect(stripHtmlTags('<b>bold</b> and <i>italic</i>')).toBe('bold and italic');
  });

  it('trims whitespace', () => {
    expect(stripHtmlTags('  hello world  ')).toBe('hello world');
  });

  it('handles empty input', () => {
    expect(stripHtmlTags('')).toBe('');
  });

  it('strips self-closing tags', () => {
    expect(stripHtmlTags('text<br/>more')).toBe('textmore');
  });
});
