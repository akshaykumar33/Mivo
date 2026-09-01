import { Injectable } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { UserStatus } from '@mivo/shared';

@Injectable()
export class PresenceService {
  // Ephemeral in-memory presence registry (mirrors Redis state)
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private userStatus = new Map<string, { status: UserStatus; customStatus?: string | null; lastHeartbeat: number }>();

  setUserOnline(userId: string, socketId: string, status: UserStatus = 'ONLINE', customStatus?: string | null) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    this.userStatus.set(userId, { status, customStatus, lastHeartbeat: Date.now() });

    // Update DB async
    prisma.user
      .update({
        where: { id: userId },
        data: { status, customStatus, lastSeenAt: new Date() },
      })
      .catch(() => {});
  }

  setUserOffline(userId: string, socketId: string): boolean {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.userStatus.set(userId, { status: 'OFFLINE', lastHeartbeat: Date.now() });

        prisma.user
          .update({
            where: { id: userId },
            data: { status: 'OFFLINE', lastSeenAt: new Date() },
          })
          .catch(() => {});

        return true; // Fully offline
      }
    }
    return false;
  }

  heartbeat(userId: string, status: UserStatus = 'ONLINE', customStatus?: string | null) {
    this.userStatus.set(userId, { status, customStatus, lastHeartbeat: Date.now() });
  }

  getUserStatus(userId: string): { status: UserStatus; customStatus?: string | null } {
    const existing = this.userStatus.get(userId);
    return existing ? { status: existing.status, customStatus: existing.customStatus } : { status: 'OFFLINE' };
  }
}
