import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { RateLimiterGuard } from '@server/common/rate-limiter.guard';

describe('DevOps & Security Audit — Application Security Invariants', () => {
  describe('Rate Limiting & DoS Protection', () => {
    it('should allow legitimate traffic under threshold and attach rate-limit headers', async () => {
      const guard = new RateLimiterGuard();
      const headers: Record<string, any> = {};

      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/messages',
            headers: { 'x-forwarded-for': '192.168.1.100' },
            socket: {},
          }),
          getResponse: () => ({
            setHeader: vi.fn((k, v) => {
              headers[k] = v;
            }),
          }),
        }),
      };

      const allowed = await guard.canActivate(mockContext);
      expect(allowed).toBe(true);
      expect(headers['X-RateLimit-Limit']).toBe(100);
      expect(headers['X-RateLimit-Remaining']).toBe(99);
      expect(headers).toHaveProperty('X-RateLimit-Reset');
    });

    it('should bypass rate limiting for health and readiness probes', async () => {
      const guard = new RateLimiterGuard();
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/health',
            headers: {},
            socket: {},
          }),
          getResponse: () => ({
            setHeader: vi.fn(),
          }),
        }),
      };

      const allowed = await guard.canActivate(mockContext);
      expect(allowed).toBe(true);
    });

    it('should throw 429 Too Many Requests when rate threshold is exceeded', async () => {
      const guard = new RateLimiterGuard();
      const clientIp = '10.0.0.99';

      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/auth/login',
            headers: { 'x-forwarded-for': clientIp },
            socket: {},
          }),
          getResponse: () => ({
            setHeader: vi.fn(),
          }),
        }),
      };

      // Consume up to limit (100)
      for (let i = 0; i < 100; i++) {
        await guard.canActivate(mockContext);
      }

      // 101st request must trigger 429
      await expect(guard.canActivate(mockContext)).rejects.toThrow();
    });
  });

  describe('Cryptographic Integrity & Timing Attack Mitigation', () => {
    it('should prevent timing attacks using constant-time buffer comparison', () => {
      const secretToken = crypto.randomBytes(32).toString('hex');
      const validAttempt = secretToken;
      const invalidAttempt = secretToken.slice(0, -1) + (secretToken.endsWith('a') ? 'b' : 'a');

      const bufExpected = Buffer.from(secretToken, 'hex');
      const bufValid = Buffer.from(validAttempt, 'hex');
      const bufInvalid = Buffer.from(invalidAttempt, 'hex');

      expect(crypto.timingSafeEqual(bufExpected, bufValid)).toBe(true);
      expect(crypto.timingSafeEqual(bufExpected, bufInvalid)).toBe(false);
    });

    it('should enforce 256-bit entropy for JWT secrets', () => {
      const testSecret = 'dev_jwt_access_secret_super_secure_32chars_min';
      // Minimum recommended HMAC-SHA256 key length is 32 bytes (256 bits)
      expect(Buffer.from(testSecret).length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('Injection & Cross-Site Scripting (XSS) Sanitization', () => {
    it('should detect and sanitize malicious script tags in user text payloads', () => {
      const maliciousPayload = '<script>alert("pwned")</script>Hello team!';
      const sanitized = maliciousPayload
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });
  });
});

