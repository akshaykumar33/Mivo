import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { SecurityAuditService } from './security-audit.service.js';

@Injectable()
export class SecurityAuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: SecurityAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Skip verbose logs for health checks
    if (req.path.startsWith('/health') || req.path === '/api/health') {
      return next.handle();
    }

    const startTime = Date.now();
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const user = (req as any).user;

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode || 200;

        // Log sensitive state mutations or suspicious status codes
        if (req.method !== 'GET' || statusCode >= 400) {
          this.auditService.logEvent({
            severity: statusCode >= 400 ? 'WARN' : 'INFO',
            category: 'DATA_ACCESS',
            action: `${req.method} ${req.path}`,
            status: statusCode >= 400 ? 'DENIED' : 'SUCCESS',
            actor: {
              id: user?.sub || user?.id,
              username: user?.username,
              ipAddress: ip,
              userAgent: userAgent.slice(0, 150),
            },
            resource: {
              type: req.path.split('/')[2] || 'root',
            },
            details: {
              statusCode,
              durationMs,
            },
          });
        }
      }),
      catchError((err) => {
        const durationMs = Date.now() - startTime;
        const statusCode = err.status || HttpStatus.INTERNAL_SERVER_ERROR;

        this.auditService.logEvent({
          severity: statusCode === HttpStatus.TOO_MANY_REQUESTS ? 'WARN' : 'CRITICAL',
          category: 'SECURITY_DEFENSE',
          action: `${req.method} ${req.path}`,
          status: 'FAILURE',
          actor: {
            id: user?.sub || user?.id,
            username: user?.username,
            ipAddress: ip,
            userAgent: userAgent.slice(0, 150),
          },
          details: {
            statusCode,
            errorMessage: err.message,
            durationMs,
          },
        });

        throw err;
      })
    );
  }
}

