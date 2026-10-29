import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { prisma } from '@mivo/database';
import Redis from 'ioredis';

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
  };
}

@Controller('health')
export class HealthController {
  private redisClient: Redis | null = null;

  constructor() {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = new Redis(process.env.REDIS_URL, {
          connectTimeout: 3000,
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
   * Comprehensive health check with database and cache probes.
   * Standard for uptime monitors, Render health checks, AWS ALB target groups.
   */
  @Get()
  async check(@Res() res: Response): Promise<Response> {
    const startTime = Date.now();
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatency = 0;
    let dbError: string | undefined;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
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
          await this.redisClient.ping();
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

    const mem = process.memoryUsage();
    const isDegraded = dbStatus === 'down' || redisStatus === 'down';
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
      },
    };

    return res.status(httpStatus).json(payload);
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
   * Kubernetes / Container Readiness Probe.
   * Verifies critical database dependency is ready to accept traffic.
   */
  @Get('ready')
  async ready(@Res() res: Response): Promise<Response> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({ status: 'ready' });
    } catch (err: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unready',
        error: err.message || 'Database unreachable',
      });
    }
  }
}

