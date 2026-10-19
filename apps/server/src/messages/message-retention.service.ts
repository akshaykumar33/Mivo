import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@mivo/database';

export const DEFAULT_MESSAGE_RETENTION_DAYS = 365; // 1 year auto-disappearing retention policy
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours background cleanup cycle

export interface RetentionPolicyInfo {
  policy: string;
  retentionDays: number;
  cutoffDate: string;
  description: string;
  autoCleanupEnabled: boolean;
  cleanupIntervalHours: number;
}

export interface PurgeResult {
  success: boolean;
  retentionDays: number;
  cutoffDate: string;
  purgedRoomMessages: number;
  purgedDirectMessages: number;
  clearedStatuses: number;
  executedAt: string;
}

@Injectable()
export class MessageRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageRetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.logger.log(`Auto-disappearing message retention enabled (> 1 year / ${DEFAULT_MESSAGE_RETENTION_DAYS} days)`);

    // Schedule initial cleanup run shortly after startup (5 seconds delay)
    const initialDelay = setTimeout(() => {
      this.purgeExpiredMessages().catch((err) => {
        this.logger.warn(`Initial message retention purge encountered error: ${err.message}`);
      });
    }, 5000);

    if (initialDelay.unref) {
      initialDelay.unref();
    }

    // Recurring background cleanup timer
    this.timer = setInterval(() => {
      this.purgeExpiredMessages().catch((err) => {
        this.logger.warn(`Scheduled message retention purge encountered error: ${err.message}`);
      });
    }, CLEANUP_INTERVAL_MS);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getRetentionPolicy(): RetentionPolicyInfo {
    const cutoffDate = new Date(Date.now() - DEFAULT_MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    return {
      policy: 'AUTO_DISAPPEAR_OLDER_THAN_1_YEAR',
      retentionDays: DEFAULT_MESSAGE_RETENTION_DAYS,
      cutoffDate: cutoffDate.toISOString(),
      description: 'Messages older than 1 year (365 days) automatically disappear from views and are purged.',
      autoCleanupEnabled: true,
      cleanupIntervalHours: CLEANUP_INTERVAL_MS / (60 * 60 * 1000),
    };
  }

  async purgeExpiredMessages(retentionDays = DEFAULT_MESSAGE_RETENTION_DAYS): Promise<PurgeResult> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    this.logger.log(`Running message retention purge for messages created before ${cutoffDate.toISOString()}...`);

    try {
      // 1. Purge room messages older than retention cutoff
      const deletedRoomMessages = await prisma.message.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      // 2. Purge direct & group conversation messages older than retention cutoff
      const deletedDirectMessages = await prisma.directMessage.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      // 3. Clear expired custom statuses as well
      const clearedStatuses = await prisma.user.updateMany({
        where: {
          customStatusExpiresAt: { lte: new Date() },
          customStatus: { not: null },
        },
        data: {
          customStatus: null,
          customStatusExpiresAt: null,
        },
      });

      const result: PurgeResult = {
        success: true,
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        purgedRoomMessages: deletedRoomMessages.count,
        purgedDirectMessages: deletedDirectMessages.count,
        clearedStatuses: clearedStatuses.count,
        executedAt: new Date().toISOString(),
      };

      this.logger.log(
        `Retention purge complete: ${deletedRoomMessages.count} room messages, ${deletedDirectMessages.count} DMs purged; ${clearedStatuses.count} expired statuses cleared.`
      );

      return result;
    } catch (err: any) {
      this.logger.error(`Failed to execute retention purge: ${err.message}`, err.stack);
      throw err;
    }
  }
}
