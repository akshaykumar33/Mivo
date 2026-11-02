import { Injectable, Logger } from '@nestjs/common';

export type SecOpsSeverity = 'INFO' | 'WARN' | 'CRITICAL';
export type SecOpsCategory = 'AUTH' | 'RBAC' | 'DATA_ACCESS' | 'SECURITY_DEFENSE' | 'SYSTEM';
export type SecOpsStatus = 'SUCCESS' | 'FAILURE' | 'DENIED';

export interface SecOpsAuditEvent {
  eventId: string;
  timestamp: string;
  severity: SecOpsSeverity;
  category: SecOpsCategory;
  action: string;
  status: SecOpsStatus;
  actor: {
    id?: string;
    username?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  resource?: {
    type: string;
    id?: string;
  };
  details?: Record<string, any>;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger('SecOpsAudit');
  private static readonly SENSITIVE_KEYS = new Set([
    'password',
    'pass',
    'passwordhash',
    'token',
    'accesstoken',
    'refreshtoken',
    'secret',
    'jwt',
    'authorization',
    'apikey',
    'cookie',
  ]);

  private static readonly SENSITIVE_SUBSTRINGS = [
    'password',
    'secret',
    'token',
    'privatekey',
    'apikey',
    'credential',
    'bearer',
  ];

  /**
   * Records a security-relevant event for SOC2/ISO 27001 SIEM log aggregation.
   */
  logEvent(event: Omit<SecOpsAuditEvent, 'eventId' | 'timestamp'>): SecOpsAuditEvent {
    const fullEvent: SecOpsAuditEvent = {
      eventId: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...event,
      details: this.sanitizeMetadata(event.details),
    };

    const serialized = JSON.stringify(fullEvent);

    if (fullEvent.severity === 'CRITICAL') {
      this.logger.error(`[SECOPS_ALERT] ${serialized}`);
    } else if (fullEvent.severity === 'WARN') {
      this.logger.warn(`[SECOPS_WARN] ${serialized}`);
    } else {
      this.logger.log(`[SECOPS_INFO] ${serialized}`);
    }

    return fullEvent;
  }

  /**
   * Recursively redacts sensitive parameters from audit log payloads.
   */
  public sanitizeMetadata(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeMetadata(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
      const isSensitive =
        SecurityAuditService.SENSITIVE_KEYS.has(normalizedKey) ||
        SecurityAuditService.SENSITIVE_SUBSTRINGS.some((sub) => normalizedKey.includes(sub));

      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
