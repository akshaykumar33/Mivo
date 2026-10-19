import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { UserStatus } from '@mivo/shared';
import Redis from 'ioredis';

@Injectable()
export class PresenceService implements OnModuleInit {
  private readonly logger = new Logger(PresenceService.name);
  private redisClient: Redis | null = null;
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private userStatus = new Map<
    string,
    { status: UserStatus; customStatus?: string | null; customStatusExpiresAt?: string | null; lastHeartbeat: number }
  >();

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

  private isStatusExpired(customStatusExpiresAt?: string | null): boolean {
    if (!customStatusExpiresAt) return false;
    const exp = new Date(customStatusExpiresAt).getTime();
    return !isNaN(exp) && exp <= Date.now();
  }

  async setUserOnline(
    userId: string,
    socketId: string,
    status: UserStatus = 'ONLINE',
    customStatus?: string | null,
    customStatusExpiresAt?: string | null
  ) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);

    const expired = this.isStatusExpired(customStatusExpiresAt);
    const activeCustomStatus = expired ? null : customStatus;
    const activeExpiresAt = expired ? null : customStatusExpiresAt;

    this.userStatus.set(userId, {
      status,
      customStatus: activeCustomStatus,
      customStatusExpiresAt: activeExpiresAt,
      lastHeartbeat: Date.now(),
    });

    // Redis ephemeral presence state with 120s TTL
    if (this.redisClient) {
      try {
        await Promise.all([
          this.redisClient.sadd(`presence:sockets:${userId}`, socketId),
          this.redisClient.set(
            `presence:user:${userId}`,
            JSON.stringify({
              status,
              customStatus: activeCustomStatus,
              customStatusExpiresAt: activeExpiresAt,
              lastHeartbeat: Date.now(),
            }),
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
        data: {
          status,
          customStatus: activeCustomStatus,
          customStatusExpiresAt: activeExpiresAt ? new Date(activeExpiresAt) : null,
          lastSeenAt: new Date(),
        },
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
        const existing = this.userStatus.get(userId);
        this.userStatus.set(userId, {
          status: 'OFFLINE',
          customStatus: existing?.customStatus,
          customStatusExpiresAt: existing?.customStatusExpiresAt,
          lastHeartbeat: Date.now(),
        });
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

  async updateUserPresence(
    userId: string,
    status?: UserStatus,
    customStatus?: string | null,
    customStatusExpiresAt?: string | null
  ) {
    const existing = this.userStatus.get(userId);
    const newStatus = status || existing?.status || 'ONLINE';

    let newCustomStatus = customStatus !== undefined ? customStatus : existing?.customStatus;
    let newExpiresAt =
      customStatusExpiresAt !== undefined ? customStatusExpiresAt : existing?.customStatusExpiresAt;

    if (this.isStatusExpired(newExpiresAt)) {
      newCustomStatus = null;
      newExpiresAt = null;
    }

    this.userStatus.set(userId, {
      status: newStatus,
      customStatus: newCustomStatus,
      customStatusExpiresAt: newExpiresAt,
      lastHeartbeat: Date.now(),
    });

    if (this.redisClient) {
      try {
        await this.redisClient.set(
          `presence:user:${userId}`,
          JSON.stringify({
            status: newStatus,
            customStatus: newCustomStatus,
            customStatusExpiresAt: newExpiresAt,
            lastHeartbeat: Date.now(),
          }),
          'EX',
          120
        );
      } catch (err: any) {
        this.logger.warn(`Redis presence update failed: ${err.message}`);
      }
    }

    // Persist to database
    await prisma.user
      .update({
        where: { id: userId },
        data: {
          status: newStatus,
          customStatus: newCustomStatus,
          customStatusExpiresAt: newExpiresAt ? new Date(newExpiresAt) : null,
          lastSeenAt: new Date(),
        },
      })
      .catch((err) => {
        this.logger.warn(`DB presence update failed: ${err.message}`);
      });

    return {
      status: newStatus,
      customStatus: newCustomStatus,
      customStatusExpiresAt: newExpiresAt,
    };
  }

  async heartbeat(
    userId: string,
    status: UserStatus = 'ONLINE',
    customStatus?: string | null,
    customStatusExpiresAt?: string | null
  ) {
    const expired = this.isStatusExpired(customStatusExpiresAt);
    const activeCustomStatus = expired ? null : customStatus;
    const activeExpiresAt = expired ? null : customStatusExpiresAt;

    this.userStatus.set(userId, {
      status,
      customStatus: activeCustomStatus,
      customStatusExpiresAt: activeExpiresAt,
      lastHeartbeat: Date.now(),
    });

    if (this.redisClient) {
      try {
        await this.redisClient.set(
          `presence:user:${userId}`,
          JSON.stringify({
            status,
            customStatus: activeCustomStatus,
            customStatusExpiresAt: activeExpiresAt,
            lastHeartbeat: Date.now(),
          }),
          'EX',
          120
        );
      } catch (err: any) {
        this.logger.warn(`Redis presence heartbeat failed: ${err.message}`);
      }
    }
  }

  getUserStatus(userId: string): {
    status: UserStatus;
    customStatus?: string | null;
    customStatusExpiresAt?: string | null;
  } {
    const existing = this.userStatus.get(userId);
    if (!existing) {
      return { status: 'OFFLINE' };
    }

    if (this.isStatusExpired(existing.customStatusExpiresAt)) {
      existing.customStatus = null;
      existing.customStatusExpiresAt = null;
    }

    return {
      status: existing.status,
      customStatus: existing.customStatus,
      customStatusExpiresAt: existing.customStatusExpiresAt,
    };
  }
}

