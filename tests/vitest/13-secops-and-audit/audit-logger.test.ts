import { describe, it, expect } from 'vitest';
import { SecurityAuditService } from '@server/common/security-audit.service';

describe('SecOps & DevSecOps — Security Audit Logging & Redaction', () => {
  it('should emit structured security audit records with eventId and ISO timestamp', () => {
    const service = new SecurityAuditService();
    const event = service.logEvent({
      severity: 'INFO',
      category: 'AUTH',
      action: 'USER_LOGIN_SUCCESS',
      status: 'SUCCESS',
      actor: {
        id: 'usr_123',
        username: 'alice',
        ipAddress: '192.168.1.50',
      },
      resource: {
        type: 'session',
        id: 'sess_999',
      },
      details: {
        authMethod: 'password',
      },
    });

    expect(event.eventId).toMatch(/^sec_\d+_[a-z0-9]+$/);
    expect(event.timestamp).toBeTruthy();
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
    expect(event.severity).toBe('INFO');
    expect(event.category).toBe('AUTH');
    expect(event.status).toBe('SUCCESS');
  });

  it('should recursively redact sensitive fields from audit metadata', () => {
    const service = new SecurityAuditService();
    const rawPayload = {
      username: 'bob',
      password: 'super_secret_password_123',
      token: 'jwt_access_token_value',
      authorization: 'Bearer secret_auth_token',
      apiKey: 'secret_api_key_456',
      nested: {
        refreshToken: 'refresh_secret',
        regularField: 'safe_value',
        deepList: [
          { secret: 'internal_secret', visible: 42 },
        ],
      },
    };

    const sanitized = service.sanitizeMetadata(rawPayload);

    expect(sanitized.username).toBe('bob');
    expect(sanitized.password).toBe('***REDACTED***');
    expect(sanitized.token).toBe('***REDACTED***');
    expect(sanitized.authorization).toBe('***REDACTED***');
    expect(sanitized.apiKey).toBe('***REDACTED***');
    expect(sanitized.nested.refreshToken).toBe('***REDACTED***');
    expect(sanitized.nested.regularField).toBe('safe_value');
    expect(sanitized.nested.deepList[0].secret).toBe('***REDACTED***');
    expect(sanitized.nested.deepList[0].visible).toBe(42);
  });

  it('should handle null, primitives, and empty objects gracefully in sanitizer', () => {
    const service = new SecurityAuditService();
    expect(service.sanitizeMetadata(null)).toBeNull();
    expect(service.sanitizeMetadata(undefined)).toBeUndefined();
    expect(service.sanitizeMetadata('hello')).toBe('hello');
    expect(service.sanitizeMetadata(12345)).toBe(12345);
    expect(service.sanitizeMetadata({})).toEqual({});
  });
});

