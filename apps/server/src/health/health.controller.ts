import { Controller, Get, HttpStatus, Res, Optional, Inject } from '@nestjs/common';
import { Response } from 'express';
import { prisma } from '@mivo/database';
import Redis from 'ioredis';
import { StorageService } from '../storage/storage.service.js';
import { KeepAliveService } from './keep-alive.service.js';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  system: {
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
    };
  };
  services: {
    database: {
      status: 'up' | 'down';
      responseTimeMs?: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down' | 'unconfigured';
      responseTimeMs?: number;
      error?: string;
    };
    storage?: {
      status: 'up' | 'down' | 'unconfigured';
      responseTimeMs?: number;
      error?: string;
    };
  };
}

@Controller('health')
export class HealthController {
  private redisClient: Redis | null = null;
  // Calibrated for serverless databases (Neon) which require TLS handshake & compute spin-up
  private static readonly PROBE_TIMEOUT_MS = Number(process.env.DB_PROBE_TIMEOUT_MS) || 8000;

  constructor(
    @Optional() private readonly keepAliveService?: KeepAliveService,
    @Optional() private readonly storageService?: StorageService
  ) {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = new Redis(process.env.REDIS_URL, {
          connectTimeout: 2000,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
        });
      } catch {
        this.redisClient = null;
      }
    }
  }

  /**
   * Comprehensive health check with database, cache, and storage circuit breakers.
   * Standard for uptime monitors, Render health checks, AWS ALB target groups.
   */
  @Get()
  async check(@Res() res: Response): Promise<Response> {
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatency = 0;
    let dbError: string | undefined;

    try {
      const dbStart = Date.now();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database probe timed out')), HealthController.PROBE_TIMEOUT_MS)
      );
      await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
      dbLatency = Date.now() - dbStart;
      dbStatus = 'up';
    } catch (err: any) {
      dbError = err.message || 'Database unreachable';
    }

    let redisStatus: 'up' | 'down' | 'unconfigured' = 'unconfigured';
    let redisLatency = 0;
    let redisError: string | undefined;

    if (process.env.REDIS_URL) {
      try {
        const rStart = Date.now();
        if (this.redisClient) {
          if (this.redisClient.status !== 'ready') {
            await this.redisClient.connect().catch(() => {});
          }
          const redisTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Redis probe timed out')), HealthController.PROBE_TIMEOUT_MS)
          );
          await Promise.race([this.redisClient.ping(), redisTimeout]);
          redisLatency = Date.now() - rStart;
          redisStatus = 'up';
        } else {
          redisStatus = 'down';
        }
      } catch (err: any) {
        redisStatus = 'down';
        redisError = err.message || 'Redis ping failed';
      }
    }

    let storageStatus: 'up' | 'down' | 'unconfigured' = 'unconfigured';
    let storageLatency = 0;
    let storageError: string | undefined;

    if (this.storageService) {
      try {
        const storageRes = await this.storageService.checkHealth();
        storageStatus = storageRes.status;
        storageLatency = storageRes.responseTimeMs;
        storageError = storageRes.error;
      } catch (err: any) {
        storageStatus = 'down';
        storageError = err.message || 'Storage check failed';
      }
    }

    const mem = process.memoryUsage();
    const httpStatus = dbStatus === 'up' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    const payload: HealthCheckResponse = {
      status: dbStatus === 'up' && (redisStatus === 'up' || redisStatus === 'unconfigured') ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production',
      version: process.env.npm_package_version || '1.0.0',
      system: {
        memory: {
          heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        },
      },
      services: {
        database: {
          status: dbStatus,
          responseTimeMs: dbLatency,
          ...(dbError ? { error: dbError } : {}),
        },
        redis: {
          status: redisStatus,
          responseTimeMs: redisLatency,
          ...(redisError ? { error: redisError } : {}),
        },
        storage: {
          status: storageStatus,
          responseTimeMs: storageLatency,
          ...(storageError ? { error: storageError } : {}),
        },
      },
    };

    return res.status(httpStatus).json(payload);
  }

  /**
   * Dedicated Keep-Alive endpoint for external monitors (Render, GitHub Actions, UptimeRobot, cron-job.org).
   * Simultaneously touches:
   * 1. Render HTTP ingress (resets 15-minute spin-down timer)
   * 2. Neon PostgreSQL (executes SELECT 1, resetting 5-minute compute sleep)
   * 3. Upstash Redis (executes PING, resetting 30-day inactivity archive)
   * 4. Supabase S3 (executes bucket probe, resetting 7-day project pause)
   */
  @Get('keepalive')
  async keepalive(@Res() res: Response): Promise<Response> {
    if (this.keepAliveService) {
      const report = await this.keepAliveService.executePulse();
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        message: 'Keep-alive pulse executed across all connected services.',
        report,
      });
    }

    // Direct fallback if KeepAliveService is not injected
    const start = Date.now();
    let dbStatus = 'down';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {}

    let redisStatus = 'unconfigured';
    if (this.redisClient) {
      try {
        await this.redisClient.ping();
        redisStatus = 'up';
      } catch {
        redisStatus = 'down';
      }
    }

    let storageStatus = 'unconfigured';
    if (this.storageService) {
      const sRes = await this.storageService.checkHealth();
      storageStatus = sRes.status;
    }

    return res.status(HttpStatus.OK).json({
      status: 'ok',
      message: 'Keep-alive fallback probe executed.',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      services: {
        neon: { status: dbStatus, inactivityLimit: '5 minutes' },
        upstashRedis: { status: redisStatus, inactivityLimit: '30 days' },
        supabaseS3: { status: storageStatus, inactivityLimit: '7 days' },
      },
    });
  }

  /**
   * Kubernetes / Container Liveness Probe.
   * Returns 200 OK immediately if the Node.js event loop is responsive.
   */
  @Get('live')
  live(@Res() res: Response): Response {
    return res.status(HttpStatus.OK).json({ status: 'alive' });
  }

  /**
   * Kubernetes / Container Readiness Probe with circuit breaker.
   */
  @Get('ready')
  async ready(@Res() res: Response): Promise<Response> {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database readiness timed out')), HealthController.PROBE_TIMEOUT_MS)
      );
      await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
      return res.status(HttpStatus.OK).json({ status: 'ready' });
    } catch (err: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unready',
        error: err.message || 'Database unreachable',
      });
    }
  }
}
