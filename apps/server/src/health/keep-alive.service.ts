import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown, Optional } from '@nestjs/common';
import { prisma } from '@mivo/database';
import Redis from 'ioredis';
import { StorageService } from '../storage/storage.service.js';

export interface ServiceKeepAliveResult {
  status: 'up' | 'down' | 'unconfigured';
  responseTimeMs: number;
  inactivityLimit: string;
  recommendedPingInterval: string;
  error?: string;
}

export interface KeepAlivePulseReport {
  timestamp: string;
  pulseNumber: number;
  render: {
    service: string;
    region: string;
    uptimeSeconds: number;
    inactivityLimit: string;
    recommendedPingInterval: string;
    externalUrlConfigured: boolean;
  };
  services: {
    neon: ServiceKeepAliveResult;
    upstashRedis: ServiceKeepAliveResult;
    supabaseS3: ServiceKeepAliveResult;
  };
}

@Injectable()
export class KeepAliveService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(KeepAliveService.name);
  private timer: NodeJS.Timeout | null = null;
  private redisClient: Redis | null = null;
  private pulseCount = 0;

  // Default interval: 4 minutes (240,000 ms)
  // Neon compute auto-suspends after 5 minutes of inactivity; 4m safely resets the timer.
  // Render free tier spins down after 15 minutes of inactivity.
  private readonly intervalMs: number = Number(process.env.KEEP_ALIVE_INTERVAL_MS) || 4 * 60 * 1000;

  constructor(@Optional() private readonly storageService?: StorageService) {
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

  onApplicationBootstrap() {
    const isEnabled = process.env.KEEP_ALIVE_ENABLED !== 'false';
    if (!isEnabled) {
      this.logger.log('Keep-Alive automated pulse daemon is disabled via KEEP_ALIVE_ENABLED=false');
      return;
    }

    this.logger.log(
      `Starting Keep-Alive pulse daemon (Interval: ${this.intervalMs / 1000}s / ${this.intervalMs / 60000}m) to prevent Neon DB (5m timeout), Render (15m timeout), Supabase S3 (7d pause), and Upstash from sleeping.`
    );

    // Run first keep-alive pulse shortly after startup
    setTimeout(() => {
      this.executePulse().catch((err) => {
        this.logger.warn(`Initial keep-alive pulse warning: ${err.message}`);
      });
    }, 5000);

    // Schedule periodic heartbeat
    this.timer = setInterval(() => {
      this.executePulse().catch((err) => {
        this.logger.warn(`Scheduled keep-alive pulse warning: ${err.message}`);
      });
    }, this.intervalMs);
  }

  onApplicationShutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch {}
    }
  }

  /**
   * Executes a full round of keep-alive probes across Neon DB, Upstash Redis,
   * Supabase S3, and optional Render external URL self-ingress.
   */
  async executePulse(): Promise<KeepAlivePulseReport> {
    this.pulseCount++;
    // Calibrated for serverless databases (Neon) which require TLS handshake & compute spin-up
    const PROBE_TIMEOUT_MS = Number(process.env.DB_PROBE_TIMEOUT_MS) || 8000;

    // 1. Neon DB Keep-Alive (5-minute inactivity scale-to-zero)
    let neonStatus: 'up' | 'down' = 'down';
    let neonLatency = 0;
    let neonError: string | undefined;

    try {
      const start = Date.now();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Neon probe timed out')), PROBE_TIMEOUT_MS)
      );
      await Promise.race([prisma.$queryRawUnsafe('SELECT 1'), timeoutPromise]);
      neonLatency = Date.now() - start;
      neonStatus = 'up';
    } catch (err: any) {
      neonError = err.message || 'Neon database probe failed';
    }

    // 2. Upstash Redis Keep-Alive (30-day inactivity archive / socket drop)
    let redisStatus: 'up' | 'down' | 'unconfigured' = 'unconfigured';
    let redisLatency = 0;
    let redisError: string | undefined;

    if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
      try {
        const start = Date.now();
        // Method A: ioredis ping
        if (this.redisClient) {
          if (this.redisClient.status !== 'ready') {
            await this.redisClient.connect().catch(() => {});
          }
          const redisTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Redis probe timed out')), PROBE_TIMEOUT_MS)
          );
          await Promise.race([this.redisClient.ping(), redisTimeout]);
          redisLatency = Date.now() - start;
          redisStatus = 'up';
        } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
          // Method B: Upstash REST Ping
          const restRes = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
            headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
          });
          const restJson = (await restRes.json()) as any;
          if (restJson.result === 'PONG') {
            redisLatency = Date.now() - start;
            redisStatus = 'up';
          } else {
            throw new Error(`Unexpected REST response: ${JSON.stringify(restJson)}`);
          }
        }
      } catch (err: any) {
        redisStatus = 'down';
        redisError = err.message || 'Redis ping failed';
      }
    }

    // 3. Supabase S3 / Storage Keep-Alive (7-day project pause)
    let storageStatus: 'up' | 'down' | 'unconfigured' = 'unconfigured';
    let storageLatency = 0;
    let storageError: string | undefined;

    if (this.storageService) {
      const storageResult = await this.storageService.checkHealth();
      storageStatus = storageResult.status;
      storageLatency = storageResult.responseTimeMs;
      storageError = storageResult.error;
    } else {
      // Direct REST fallback to Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (supabaseUrl && anonKey) {
        const start = Date.now();
        try {
          const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
            headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
          });
          storageLatency = Date.now() - start;
          if (res.ok || res.status === 401 || res.status === 403) {
            storageStatus = 'up';
          }
        } catch (err: any) {
          storageStatus = 'down';
          storageError = err.message;
        }
      }
    }

    // 4. Render Self-Ingress Probe (optional self-ping if RENDER_EXTERNAL_URL is available)
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
    if (externalUrl) {
      try {
        await fetch(`${externalUrl}/health/live`, {
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        }).catch(() => {});
      } catch {}
    }

    const report: KeepAlivePulseReport = {
      timestamp: new Date().toISOString(),
      pulseNumber: this.pulseCount,
      render: {
        service: process.env.RENDER_SERVICE_NAME || 'mivo-server',
        region: process.env.RENDER_REGION || 'oregon',
        uptimeSeconds: Math.floor(process.uptime()),
        inactivityLimit: '15 minutes (free tier spins down without HTTP traffic)',
        recommendedPingInterval: '10-12 minutes',
        externalUrlConfigured: Boolean(externalUrl),
      },
      services: {
        neon: {
          status: neonStatus,
          responseTimeMs: neonLatency,
          inactivityLimit: '5 minutes (compute auto-suspends to zero)',
          recommendedPingInterval: '4 minutes',
          ...(neonError ? { error: neonError } : {}),
        },
        upstashRedis: {
          status: redisStatus,
          responseTimeMs: redisLatency,
          inactivityLimit: '30 days (auto-archives without requests)',
          recommendedPingInterval: '4-10 minutes',
          ...(redisError ? { error: redisError } : {}),
        },
        supabaseS3: {
          status: storageStatus,
          responseTimeMs: storageLatency,
          inactivityLimit: '7 days (entire project pauses without activity)',
          recommendedPingInterval: '10-60 minutes',
          ...(storageError ? { error: storageError } : {}),
        },
      },
    };

    this.logger.log(
      `[KeepAlive #${this.pulseCount}] Neon DB: ${neonStatus} (${neonLatency}ms) | Redis: ${redisStatus} (${redisLatency}ms) | Supabase S3: ${storageStatus} (${storageLatency}ms)`
    );

    return report;
  }
}

