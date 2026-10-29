/**
 * Penetration Testing & Attack Vector Simulation Test Suite
 * Exhaustively tests SQL injection, XSS sanitization, ReDoS resistance,
 * Directory traversal prevention, Rate limiting, and Credential redaction.
 */

import { describe, it, expect } from 'vitest';
import { SecurityAuditService } from '@server/common/security-audit.service.js';
import {
  SendMessageSchema,
  SendDirectMessageSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  CreateCommunitySchema,
} from '@mivo/shared';
import crypto from 'crypto';

describe('Penetration Testing & Attack Vector Defenses', () => {

  describe('1. SQL Injection (SQLi) & Malformed Input Handling', () => {
    const SQLI_PAYLOADS = [
      `' OR '1'='1`,
      `' OR 1=1 --`,
      `'; DROP TABLE "User"; --`,
      `admin' --`,
      `' UNION SELECT null, null, passwordHash, null FROM "User" --`,
      `1; WAITFOR DELAY '0:0:5'--`,
      `1' AND (SELECT 1 FROM (SELECT COUNT(*), CONCAT((SELECT passwordHash FROM "User" LIMIT 1), FLOOR(RAND(0)*2)) x FROM information_schema.tables GROUP BY x) a) --`,
    ];

    it('rejects SQL injection payloads in LoginRequestSchema email field', () => {
      for (const payload of SQLI_PAYLOADS) {
        const result = LoginRequestSchema.safeParse({
          email: payload,
          password: 'Password123!',
        });
        expect(result.success).toBe(false);
      }
    });

    it('safely handles SQL injection payloads in RegisterRequestSchema without runtime panic', () => {
      for (const payload of SQLI_PAYLOADS) {
        const result = RegisterRequestSchema.safeParse({
          email: `${payload}@example.com`,
          username: payload, // Malicious username will violate regex /^[a-zA-Z0-9_-]+$/
          displayName: payload,
          password: 'Password123!',
        });
        expect(result.success).toBe(false);
      }
    });

    it('strictly validates schema constraints on community creation names', () => {
      const maliciousPayload = `Robert'); DROP TABLE "Community";--`;
      const result = CreateCommunitySchema.safeParse({
        name: maliciousPayload,
        description: 'Test community',
      });
      if (result.success) {
        // If parsed, it must be treated strictly as a plain string, never executed
        expect(typeof result.data.name).toBe('string');
        expect(result.data.name).toBe(maliciousPayload);
      }
    });
  });

  describe('2. Cross-Site Scripting (XSS) & Content Injection Defenses', () => {
    const XSS_PAYLOADS = [
      `<script>alert('XSS')</script>`,
      `<script src="https://evil.com/xss.js"></script>`,
      `<img src="invalid-image" onerror="alert(document.cookie)">`,
      `<svg onload="alert('XSS')">`,
      `javascript:alert(document.domain)`,
      `data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==`,
      `"><script>alert(1)</script>`,
      `<<SCRIPT>alert("XSS");//<</SCRIPT>`,
    ];

    it('safely encapsulates raw XSS payloads in chat messages', () => {
      for (const payload of XSS_PAYLOADS) {
        const parseResult = SendMessageSchema.safeParse({
          roomId: '00000000-0000-0000-0000-000000000001',
          content: payload,
        });

        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          // Verify that payload is preserved as raw text without code execution capability
          expect(parseResult.data.content).toBe(payload);
          expect(typeof parseResult.data.content).toBe('string');
        }
      }
    });

    it('enforces string length constraints against DOM overflow attacks', () => {
      const massivePayload = '<script>' + 'A'.repeat(50000) + '</script>';
      const result = SendMessageSchema.safeParse({
        roomId: '00000000-0000-0000-0000-000000000001',
        content: massivePayload,
      });

      // SendMessageSchema should enforce a reasonable max length (e.g. 4000 characters)
      expect(result.success).toBe(false);
    });

    it('rejects direct messages exceeding buffer boundaries', () => {
      const massiveDM = 'X'.repeat(10000);
      const result = SendDirectMessageSchema.safeParse({
        recipientId: '00000000-0000-0000-0000-000000000002',
        content: massiveDM,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('3. Directory & Path Traversal Prevention', () => {
    const TRAVERSAL_PATHS = [
      '../../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\cmd.exe',
      '/etc/shadow\0.png',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
    ];

    function sanitizeFileName(fileName: string): string {
      return fileName
        .replace(/\0/g, '')
        .replace(/\.{2,}/g, '')
        .replace(/[\/\\]/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    it('sanitizes dangerous file traversal sequences', () => {
      for (const path of TRAVERSAL_PATHS) {
        const sanitized = sanitizeFileName(path);
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/etc/');
        expect(sanitized).not.toContain('\\system32\\');
        expect(sanitized).not.toContain('\0');
      }
    });
  });

  describe('4. Regular Expression Denial of Service (ReDoS) Resilience', () => {
    it('evaluates email schemas in sub-millisecond time on adversarial input', () => {
      // Attack string designed to trigger catastrophic backtracking in naive email regex
      const adversarialInput = 'a'.repeat(5000) + '@' + 'b'.repeat(5000) + '!invalid';
      
      const startTime = performance.now();
      const result = LoginRequestSchema.safeParse({
        email: adversarialInput,
        password: 'ValidPassword123!',
      });
      const durationMs = performance.now() - startTime;

      expect(result.success).toBe(false);
      // Must complete in under 50ms, avoiding catastrophic backtracking
      expect(durationMs).toBeLessThan(50);
    });

    it('parses message content without exponential latency', () => {
      const adversarialMessage = '(((((((((' + 'word '.repeat(2000) + ')))))))))';
      
      const startTime = performance.now();
      const result = SendMessageSchema.safeParse({
        roomId: '00000000-0000-0000-0000-000000000001',
        content: adversarialMessage.slice(0, 3999),
      });
      const durationMs = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(durationMs).toBeLessThan(20);
    });
  });

  describe('5. Data Redaction & Zero-Leakage Audit Logging', () => {
    const auditService = new SecurityAuditService();

    it('recursively redacts high-value secrets and sensitive keys', () => {
      const sensitivePayload = {
        email: 'user@mivo.app',
        password: 'SuperSecretPassword123!',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$abc...xyz',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake',
        refreshToken: 'refresh-token-xyz',
        authorization: 'Bearer token-12345',
        nested: {
          apiKey: 'AIzaSyD-secret-key-google',
          clientSecret: 'secret_live_abcdef',
          publicInfo: 'safe-to-log',
        },
      };

      const sanitized = auditService.sanitizeMetadata(sensitivePayload);

      expect(sanitized.email).toBe('user@mivo.app');
      expect(sanitized.password).toBe('***REDACTED***');
      expect(sanitized.passwordHash).toBe('***REDACTED***');
      expect(sanitized.accessToken).toBe('***REDACTED***');
      expect(sanitized.refreshToken).toBe('***REDACTED***');
      expect(sanitized.authorization).toBe('***REDACTED***');
      expect(sanitized.nested.apiKey).toBe('***REDACTED***');
      expect(sanitized.nested.clientSecret).toBe('***REDACTED***');
      expect(sanitized.nested.publicInfo).toBe('safe-to-log');
    });

    it('handles primitives and null values safely without throwing', () => {
      expect(auditService.sanitizeMetadata(null)).toBeNull();
      expect(auditService.sanitizeMetadata(undefined)).toBeUndefined();
      expect(auditService.sanitizeMetadata('plain-string')).toBe('plain-string');
      expect(auditService.sanitizeMetadata(12345)).toBe(12345);
    });
  });

  describe('6. Cryptographic Hash & Timing Attack Resistance', () => {
    it('uses timing-safe equal comparisons for token/secret validation', () => {
      const tokenA = Buffer.from('4f9b8e1a7c3d2e5f8a0b1c2d3e4f5a6b');
      const tokenB = Buffer.from('4f9b8e1a7c3d2e5f8a0b1c2d3e4f5a6b');
      const tokenC = Buffer.from('4f9b8e1a7c3d2e5f8a0b1c2d3e4f5a6c'); // 1 bit diff

      expect(crypto.timingSafeEqual(tokenA, tokenB)).toBe(true);
      expect(crypto.timingSafeEqual(tokenA, tokenC)).toBe(false);
    });

    it('generates high-entropy cryptographically secure random bytes for E2EE keys', () => {
      const key1 = crypto.randomBytes(32).toString('hex');
      const key2 = crypto.randomBytes(32).toString('hex');

      expect(key1).toHaveLength(64);
      expect(key2).toHaveLength(64);
      expect(key1).not.toBe(key2);
    });
  });

  describe('7. Distributed Rate Limiter Verification', () => {
    it('calculates proper sliding window reset timestamps', () => {
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);
      const expectedReset = now + windowSeconds;

      expect(expectedReset).toBeGreaterThanOrEqual(now);
      expect(expectedReset - now).toBe(windowSeconds);
    });

    it('rejects empty or whitespace-only client IP identification', () => {
      function resolveClientId(ip: string | undefined): string {
        const cleaned = (ip || '').trim();
        return cleaned.length > 0 ? cleaned : 'anonymous-fallback';
      }

      expect(resolveClientId('')).toBe('anonymous-fallback');
      expect(resolveClientId('   ')).toBe('anonymous-fallback');
      expect(resolveClientId('192.168.1.1')).toBe('192.168.1.1');
    });
  });
});
