import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { UpdateProfileInput, UpdateStatusInput, UserDTO, UserSummaryDTO, REALTIME_EVENTS } from '@mivo/shared';
import { PresenceService } from '../realtime/presence.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => PresenceService))
    private presenceService: PresenceService,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway
  ) {}

  private isStatusExpired(expiresAt?: Date | string | null): boolean {
    if (!expiresAt) return false;
    const time = new Date(expiresAt).getTime();
    return !isNaN(time) && time <= Date.now();
  }

  async getProfile(userId: string): Promise<UserDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User profile not found',
      });
    }

    let customStatus = user.customStatus;
    let customStatusExpiresAt = user.customStatusExpiresAt;

    if (this.isStatusExpired(customStatusExpiresAt)) {
      customStatus = null;
      customStatusExpiresAt = null;
      prisma.user
        .update({
          where: { id: userId },
          data: { customStatus: null, customStatusExpiresAt: null },
        })
        .catch(() => {});
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      customStatus,
      customStatusExpiresAt: customStatusExpiresAt ? customStatusExpiresAt.toISOString() : null,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
    };
  }

  async updateStatus(userId: string, input: UpdateStatusInput): Promise<UserDTO> {
    const expired = this.isStatusExpired(input.customStatusExpiresAt);
    const activeCustomStatus = expired
      ? null
      : input.customStatus !== undefined
      ? input.customStatus
      : undefined;
    const activeExpiresAt = expired
      ? null
      : input.customStatusExpiresAt
      ? new Date(input.customStatusExpiresAt)
      : input.customStatusExpiresAt === null
      ? null
      : undefined;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.status && { status: input.status }),
        ...(activeCustomStatus !== undefined && { customStatus: activeCustomStatus }),
        ...(activeExpiresAt !== undefined && { customStatusExpiresAt: activeExpiresAt }),
      },
    });

    const expiresIso = updated.customStatusExpiresAt ? updated.customStatusExpiresAt.toISOString() : null;

    // Update presence registry & broadcast realtime update
    await this.presenceService.updateUserPresence(
      userId,
      updated.status,
      updated.customStatus,
      expiresIso
    );

    try {
      this.realtimeGateway.server.emit(REALTIME_EVENTS.PRESENCE_USER_UPDATED, {
        userId,
        status: updated.status,
        customStatus: updated.customStatus,
        customStatusExpiresAt: expiresIso,
      });
    } catch {}

    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      bannerUrl: updated.bannerUrl,
      bio: updated.bio,
      customStatus: updated.customStatus,
      customStatusExpiresAt: expiresIso,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      lastSeenAt: updated.lastSeenAt ? updated.lastSeenAt.toISOString() : null,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDTO> {
    const expired = this.isStatusExpired(input.customStatusExpiresAt);
    const activeCustomStatus = expired
      ? null
      : input.customStatus !== undefined
      ? input.customStatus
      : undefined;
    const activeExpiresAt = expired
      ? null
      : input.customStatusExpiresAt
      ? new Date(input.customStatusExpiresAt)
      : input.customStatusExpiresAt === null
      ? null
      : undefined;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName && { displayName: input.displayName }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
        ...(input.status && { status: input.status }),
        ...(activeCustomStatus !== undefined && { customStatus: activeCustomStatus }),
        ...(activeExpiresAt !== undefined && { customStatusExpiresAt: activeExpiresAt }),
      },
    });

    const expiresIso = updated.customStatusExpiresAt ? updated.customStatusExpiresAt.toISOString() : null;

    if (input.status || input.customStatus !== undefined || input.customStatusExpiresAt !== undefined) {
      await this.presenceService.updateUserPresence(
        userId,
        updated.status,
        updated.customStatus,
        expiresIso
      );

      try {
        this.realtimeGateway.server.emit(REALTIME_EVENTS.PRESENCE_USER_UPDATED, {
          userId,
          status: updated.status,
          customStatus: updated.customStatus,
          customStatusExpiresAt: expiresIso,
        });
      } catch {}
    }

    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      bannerUrl: updated.bannerUrl,
      bio: updated.bio,
      customStatus: updated.customStatus,
      customStatusExpiresAt: expiresIso,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      lastSeenAt: updated.lastSeenAt ? updated.lastSeenAt.toISOString() : null,
    };
  }

  async searchUsers(query?: string, currentUserId?: string): Promise<UserSummaryDTO[]> {
    const trimmed = query?.trim().toLowerCase();
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(currentUserId && { id: { not: currentUserId } }),
        ...(trimmed
          ? {
              OR: [
                { username: { contains: trimmed, mode: 'insensitive' } },
                { displayName: { contains: trimmed, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        customStatus: true,
        customStatusExpiresAt: true,
      },
    });

    return users.map((u) => {
      const expired = this.isStatusExpired(u.customStatusExpiresAt);
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        status: u.status,
        customStatus: expired ? null : u.customStatus,
        customStatusExpiresAt: expired || !u.customStatusExpiresAt ? null : u.customStatusExpiresAt.toISOString(),
      };
    });
  }
}

