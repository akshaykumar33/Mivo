import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import Redis from 'ioredis';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(RateLimiterGuard.name);
  private memoryStore = new Map<string, RateLimitRecord>();
  private redisClient: Redis | null = null;

  // Configurable thresholds (defaults: 100 requests per 60 seconds per IP)
  private readonly windowMs: number = 60 * 1000;
  private readonly maxRequests: number = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

  constructor() {
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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Skip rate limiting for internal health checks or when explicitly disabled
    if (
      process.env.RATE_LIMIT_DISABLED === 'true' ||
      req.path.startsWith('/health') ||
      req.path === '/api/health'
    ) {
      return true;
    }

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const key = `rate_limit:${ip}:${req.path}`;
    const now = Date.now();

    let currentCount = 0;
    let resetTime = now + this.windowMs;

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const current = await this.redisClient.incr(key);
        if (current === 1) {
          await this.redisClient.pexpire(key, this.windowMs);
        }
        currentCount = current;
        const ttl = await this.redisClient.pttl(key);
        resetTime = now + (ttl > 0 ? ttl : this.windowMs);
      } catch (err: any) {
        // Fallback to in-memory store if Redis drops
        currentCount = this.applyMemoryRateLimit(key, now);
      }
    } else {
      currentCount = this.applyMemoryRateLimit(key, now);
    }

    // Set rate limit headers
    const remaining = Math.max(0, this.maxRequests - currentCount);
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (currentCount > this.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please wait before making more requests.',
          retryAfterSeconds: Math.ceil((resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private applyMemoryRateLimit(key: string, now: number): number {
    // Cleanup expired keys periodically
    if (this.memoryStore.size > 10000) {
      for (const [k, v] of this.memoryStore.entries()) {
        if (v.resetTime < now) {
          this.memoryStore.delete(k);
        }
      }
    }

    const record = this.memoryStore.get(key);
    if (!record || record.resetTime < now) {
      this.memoryStore.set(key, { count: 1, resetTime: now + this.windowMs });
      return 1;
    }

    record.count += 1;
    return record.count;
  }
}
