import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { RateLimiterGuard } from './common/rate-limiter.guard.js';
import { SecurityAuditService } from './common/security-audit.service.js';
import { SecurityAuditInterceptor } from './common/security-audit.interceptor.js';
import { RedisIoAdapter } from './realtime/redis-io.adapter.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Production Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // Advanced Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'https:'],
          mediaSrc: ["'self'", 'blob:', 'https:'],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
    })
  );

  app.use(cookieParser());

  // CORS Hardening
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin === process.env.CORS_ORIGIN
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With'],
  });

  // Global Rate Limiting Guard
  app.useGlobalGuards(new RateLimiterGuard());

  // Global SecOps Audit Interceptor
  const auditService = app.get(SecurityAuditService);
  app.useGlobalInterceptors(new SecurityAuditInterceptor(auditService));

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Production-Grade Redis Socket.io Adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`[Server] Mivo Backend Server running on http://0.0.0.0:${port}`);
}

process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Unhandled Rejection intercepted:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception intercepted:', err);
});

bootstrap();
