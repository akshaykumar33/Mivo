import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { UpdateProfileInput, UpdateStatusInput, UserDTO, UserSummaryDTO, UserTier, REALTIME_EVENTS } from '@mivo/shared';
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

  async getProfile(userId: string, requesterUserId?: string): Promise<UserDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            community: { select: { id: true, name: true, slug: true } },
            role: { select: { id: true, name: true, position: true } },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User profile not found',
      });
    }

    const isTargetGuest = Boolean(user.isGuest || user.userTier === 'GUEST');
    const orgMembership = user.memberships?.[0];
    const isTargetOrg = !isTargetGuest && Boolean(orgMembership);
    const targetTier: UserTier = isTargetGuest ? 'GUEST' : isTargetOrg ? 'ORG' : 'NON_ORG';

    // If requester is a GUEST: can only view non-org accounts profile
    if (requesterUserId) {
      const requester: any = await prisma.user.findUnique({
        where: { id: requesterUserId },
        select: { id: true, isGuest: true, userTier: true } as any,
      });
      const isRequesterGuest = Boolean(requester?.isGuest || requester?.userTier === 'GUEST');
      if (isRequesterGuest && targetTier === 'ORG') {
        throw new ForbiddenException({
          code: 'ORG_PROFILE_RESTRICTED',
          message: 'Guest accounts cannot view private enterprise organization profiles. Only independent non-org creator profiles are viewable.',
        });
      }
    }

    let orgHierarchyLevel: number | null = null;
    if (orgMembership?.role?.name) {
      const roleName = orgMembership.role.name.toLowerCase();
      if (roleName.includes('owner')) orgHierarchyLevel = 1;
      else if (roleName.includes('admin')) orgHierarchyLevel = 2;
      else if (roleName.includes('manager') || roleName.includes('lead')) orgHierarchyLevel = 3;
      else orgHierarchyLevel = 4;
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
      isGuest: isTargetGuest,
      userTier: targetTier,
      organizationId: orgMembership?.community?.id || null,
      organizationName: orgMembership?.community?.name || null,
      organizationRole: orgMembership?.role?.name || null,
      organizationHierarchyLevel: orgHierarchyLevel,
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
    let isCallerGuest = false;
    let callerOrgId: string | null = null;

    if (currentUserId) {
      const currentUser: any = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          id: true,
          isGuest: true,
          userTier: true,
          memberships: {
            select: { communityId: true },
          },
        } as any,
      });
      isCallerGuest = Boolean(currentUser?.isGuest || currentUser?.userTier === 'GUEST');
      callerOrgId = currentUser?.memberships?.[0]?.communityId || null;
    }

    // Guest accounts are restricted from searching users or initiating conversations
    if (isCallerGuest) {
      return [];
    }

    const trimmed = query?.trim().toLowerCase();

    // Standard exclusion list for guest, autonomous, bot, and automated test accounts
    const restrictedAccountFilters: any[] = [
      { isGuest: true },
      { userTier: 'GUEST' },
      { username: { startsWith: 'guest_' } },
      { username: { startsWith: 'gamer_' } },
      { username: { startsWith: 'test_' } },
      { username: { startsWith: 'creator_' } },
      { username: { startsWith: 'bot_' } },
      { email: { contains: '@guest.mivo.local' } },
      { email: { contains: '@test.mivo.dev' } },
      { email: { startsWith: 'test_' } },
      { email: { startsWith: 'gamer_' } },
      { email: { startsWith: 'creator_' } },
      { displayName: { contains: 'Test User' } },
      { displayName: { contains: 'Non-Org Chess Master' } },
      { displayName: { contains: 'TestGuestBot' } },
    ];

    const users: any[] = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isGuest: false,
        userTier: { not: 'GUEST' },
        ...(currentUserId && { id: { not: currentUserId } }),
        // If caller belongs to an enterprise organization, scope directory to their organization members
        ...(callerOrgId
          ? {
              memberships: {
                some: { communityId: callerOrgId },
              },
            }
          : {}),
        NOT: restrictedAccountFilters,
        ...(trimmed
          ? {
              OR: [
                { username: { contains: trimmed, mode: 'insensitive' } },
                { displayName: { contains: trimmed, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: 30,
      orderBy: [
        { displayName: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        memberships: {
          include: {
            community: { select: { id: true, name: true } },
            role: { select: { name: true } },
          },
        },
      },
    });

    return users.map((u) => {
      const expired = this.isStatusExpired(u.customStatusExpiresAt);
      const isTargetGuest = Boolean(u.isGuest || u.userTier === 'GUEST');
      const orgMem = u.memberships?.[0];
      const isTargetOrg = !isTargetGuest && Boolean(orgMem);
      const targetTier: UserTier = isTargetGuest ? 'GUEST' : isTargetOrg ? 'ORG' : 'NON_ORG';

      let orgLevel: number | null = null;
      if (orgMem?.role?.name) {
        const rn = orgMem.role.name.toLowerCase();
        if (rn.includes('owner')) orgLevel = 1;
        else if (rn.includes('admin')) orgLevel = 2;
        else if (rn.includes('manager') || rn.includes('lead')) orgLevel = 3;
        else orgLevel = 4;
      }

      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        status: u.status,
        isGuest: isTargetGuest,
        userTier: targetTier,
        organizationId: orgMem?.community?.id || null,
        organizationName: orgMem?.community?.name || null,
        organizationRole: orgMem?.role?.name || null,
        organizationHierarchyLevel: orgLevel,
        customStatus: expired ? null : u.customStatus,
        customStatusExpiresAt: expired || !u.customStatusExpiresAt ? null : u.customStatusExpiresAt.toISOString(),
      };
    });
  }
}

