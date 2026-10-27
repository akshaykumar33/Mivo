import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Auth & Identity Module — Cryptographic Password Security & Timing-Safe Verification', () => {
  function hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
    const hash = hashPassword(password, salt);
    const hashBuffer = Buffer.from(hash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    if (hashBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, expectedBuffer);
  }

  it('generates a secure 16-byte cryptographically random salt', () => {
    const salt1 = crypto.randomBytes(16).toString('hex');
    const salt2 = crypto.randomBytes(16).toString('hex');
    expect(salt1).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(salt2).toHaveLength(32);
    expect(salt1).not.toBe(salt2);
  });

  it('produces deterministic 128-char hex hashes for identical salt & password', () => {
    const salt = 'a1b2c3d4e5f67890123456789abcdef0';
    const password = 'SuperSecretPassword123!';
    const hash1 = hashPassword(password, salt);
    const hash2 = hashPassword(password, salt);
    expect(hash1).toHaveLength(128); // 64 bytes in hex
    expect(hash1).toBe(hash2);
  });

  it('produces distinct hashes when salt differs', () => {
    const password = 'IdenticalPassword123!';
    const salt1 = crypto.randomBytes(16).toString('hex');
    const salt2 = crypto.randomBytes(16).toString('hex');
    const hash1 = hashPassword(password, salt1);
    const hash2 = hashPassword(password, salt2);
    expect(hash1).not.toBe(hash2);
  });

  it('successfully verifies correct password using timingSafeEqual', () => {
    const salt = crypto.randomBytes(16).toString('hex');
    const password = 'CorrectPassword999#';
    const hash = hashPassword(password, salt);

    const isMatch = verifyPassword(password, salt, hash);
    expect(isMatch).toBe(true);
  });

  it('rejects incorrect passwords without throwing exceptions', () => {
    const salt = crypto.randomBytes(16).toString('hex');
    const password = 'CorrectPassword999#';
    const hash = hashPassword(password, salt);

    const isMatch = verifyPassword('WrongPassword!', salt, hash);
    expect(isMatch).toBe(false);
  });
});
