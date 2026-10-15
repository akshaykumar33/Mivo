import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { UserStatus } from '@mivo/shared';
import Redis from 'ioredis';

@Injectable()
export class PresenceService implements OnModuleInit {
  private readonly logger = new Logger(PresenceService.name);
  private redisClient: Redis | null = null;
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private userStatus = new Map<string, { status: UserStatus; customStatus?: string | null; lastHeartbeat: number }>();

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl, {
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });
        await this.redisClient.connect();
        this.logger.log('⚡ Redis presence registry connected');
      } catch (err: any) {
        this.logger.warn(`Redis presence fallback to memory: ${err.message}`);
        this.redisClient = null;
      }
    }
  }

  async setUserOnline(userId: string, socketId: string, status: UserStatus = 'ONLINE', customStatus?: string | null) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    this.userStatus.set(userId, { status, customStatus, lastHeartbeat: Date.now() });

    // Redis ephemeral presence state with 120s TTL
    if (this.redisClient) {
      try {
        await Promise.all([
          this.redisClient.sadd(`presence:sockets:${userId}`, socketId),
          this.redisClient.set(
            `presence:user:${userId}`,
            JSON.stringify({ status, customStatus, lastHeartbeat: Date.now() }),
            'EX',
            120
          ),
        ]);
      } catch (err: any) {
        this.logger.warn(`Redis presence set failed: ${err.message}`);
      }
    }

    // Update DB async
    prisma.user
      .update({
        where: { id: userId },
        data: { status, customStatus, lastSeenAt: new Date() },
      })
      .catch(() => {});
  }

  async setUserOffline(userId: string, socketId: string): Promise<boolean> {
    const sockets = this.userSockets.get(userId);
    let isFullyOffline = false;

    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.userStatus.set(userId, { status: 'OFFLINE', lastHeartbeat: Date.now() });
        isFullyOffline = true;
      }
    }

    if (this.redisClient) {
      try {
        await this.redisClient.srem(`presence:sockets:${userId}`, socketId);
        if (isFullyOffline) {
          await this.redisClient.del(`presence:user:${userId}`);
        }
      } catch (err: any) {
        this.logger.warn(`Redis presence srem failed: ${err.message}`);
      }
    }

    if (isFullyOffline) {
      prisma.user
        .update({
          where: { id: userId },
          data: { status: 'OFFLINE', lastSeenAt: new Date() },
        })
        .catch(() => {});
    }

    return isFullyOffline;
  }

  async heartbeat(userId: string, status: UserStatus = 'ONLINE', customStatus?: string | null) {
    this.userStatus.set(userId, { status, customStatus, lastHeartbeat: Date.now() });

    if (this.redisClient) {
      try {
        await this.redisClient.set(
          `presence:user:${userId}`,
          JSON.stringify({ status, customStatus, lastHeartbeat: Date.now() }),
          'EX',
          120
        );
      } catch (err: any) {
        this.logger.warn(`Redis presence heartbeat failed: ${err.message}`);
      }
    }
  }

  getUserStatus(userId: string): { status: UserStatus; customStatus?: string | null } {
    const existing = this.userStatus.get(userId);
    return existing ? { status: existing.status, customStatus: existing.customStatus } : { status: 'OFFLINE' };
  }
}
