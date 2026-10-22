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

  private stripEmojis(text: string | null | undefined): string | null | undefined {
    if (text === undefined) return undefined;
    if (text === null) return null;
    const cleaned = text
      .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\u200E\u200B]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || null;
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

    let customStatus = (this.stripEmojis(user.customStatus) ?? null) as string | null;
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
      isGuest: Boolean((user as any).isGuest),
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
    };
  }

  async updateStatus(userId: string, input: UpdateStatusInput): Promise<UserDTO> {
    const sanitizedCustomStatus = this.stripEmojis(input.customStatus);
    const expired = this.isStatusExpired(input.customStatusExpiresAt);
    const activeCustomStatus = expired
      ? null
      : sanitizedCustomStatus !== undefined
      ? sanitizedCustomStatus
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
      isGuest: Boolean((updated as any).isGuest),
      createdAt: updated.createdAt.toISOString(),
      lastSeenAt: updated.lastSeenAt ? updated.lastSeenAt.toISOString() : null,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDTO> {
    const sanitizedCustomStatus = this.stripEmojis(input.customStatus);
    const expired = this.isStatusExpired(input.customStatusExpiresAt);
    const activeCustomStatus = expired
      ? null
      : sanitizedCustomStatus !== undefined
      ? sanitizedCustomStatus
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
      isGuest: Boolean((updated as any).isGuest),
      createdAt: updated.createdAt.toISOString(),
      lastSeenAt: updated.lastSeenAt ? updated.lastSeenAt.toISOString() : null,
    };
  }

  async searchUsers(query?: string, currentUserId?: string): Promise<UserSummaryDTO[]> {
    if (currentUserId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { isGuest: true },
      });
      if (currentUser?.isGuest) {
        return [];
      }
    }

    const trimmed = query?.trim().toLowerCase();
    const users: any[] = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isGuest: false,
        NOT: [
          { username: { startsWith: 'guest_' } },
        ],
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
        isGuest: true,
        customStatus: true,
        customStatusExpiresAt: true,
      } as any,
    });

    return users.map((u) => {
      const expired = this.isStatusExpired(u.customStatusExpiresAt);
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        status: u.status,
        isGuest: Boolean((u as any).isGuest),
        customStatus: expired ? null : u.customStatus,
        customStatusExpiresAt: expired || !u.customStatusExpiresAt ? null : u.customStatusExpiresAt.toISOString(),
      };
    });
  }
}

