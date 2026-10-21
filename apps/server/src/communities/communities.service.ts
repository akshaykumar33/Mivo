import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@mivo/database';
import {
  CreateCommunityInput,
  UpdateCommunityInput,
  AddCommunityMemberInput,
  EligibleUserDTO,
  CommunityDTO,
  CommunityDetailsDTO,
  CommunityMemberDTO,
  PermissionKey,
} from '@mivo/shared';
import { PermissionService } from '../rbac/permission.service.js';

@Injectable()
export class CommunitiesService {
  constructor(private permissionService: PermissionService) {}

  async listUserCommunities(userId: string): Promise<CommunityDTO[]> {
    const memberships = await prisma.communityMember.findMany({
      where: { userId },
      include: {
        community: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships
      .filter((m) => !m.community.deletedAt)
      .map((m) => ({
        id: m.community.id,
        name: m.community.name,
        slug: m.community.slug,
        description: m.community.description,
        iconUrl: m.community.iconUrl,
        bannerUrl: m.community.bannerUrl,
        ownerId: m.community.ownerId,
        visibility: m.community.visibility,
        memberCount: m.community._count.members,
        createdAt: m.community.createdAt.toISOString(),
      }));
  }

  async getCommunityDetails(communityId: string, userId: string): Promise<CommunityDetailsDTO> {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        channels: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          include: {
            rooms: {
              where: { deletedAt: null },
            },
          },
        },
        roles: {
          orderBy: { position: 'desc' },
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
        members: {
          where: { userId },
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!community || community.deletedAt) {
      throw new NotFoundException({
        code: 'COMMUNITY_NOT_FOUND',
        message: 'Community not found',
      });
    }

    const currentMember = community.members[0];
    const currentUserRole = currentMember
      ? {
          id: currentMember.role.id,
          communityId: currentMember.role.communityId,
          name: currentMember.role.name,
          color: currentMember.role.color,
          position: currentMember.role.position,
          isDefault: currentMember.role.isDefault,
          isSystem: currentMember.role.isSystem,
          permissions: currentMember.role.permissions.map((rp) => rp.permission.key as PermissionKey),
        }
      : undefined;

    return {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      iconUrl: community.iconUrl,
      bannerUrl: community.bannerUrl,
      ownerId: community.ownerId,
      visibility: community.visibility,
      memberCount: community._count.members,
      createdAt: community.createdAt.toISOString(),
      currentUserRole,
      roles: community.roles.map((r) => ({
        id: r.id,
        communityId: r.communityId,
        name: r.name,
        color: r.color,
        position: r.position,
        isDefault: r.isDefault,
        isSystem: r.isSystem,
        permissions: r.permissions.map((rp) => rp.permission.key as PermissionKey),
      })),
      channels: community.channels.map((c) => ({
        id: c.id,
        communityId: c.communityId,
        name: c.name,
        topic: c.topic,
        type: c.type,
        position: c.position,
        isPrivate: c.isPrivate,
        createdAt: c.createdAt.toISOString(),
        rooms: c.rooms.map((rm) => ({
          id: rm.id,
          channelId: rm.channelId,
          name: rm.name,
          activeMode: rm.activeMode,
          isLocked: rm.isLocked,
        })),
      })),
    };
  }

  async createCommunity(userId: string, input: CreateCommunityInput): Promise<CommunityDTO> {
    // 0. Single Organization Policy: Check if user already belongs to any organization
    const existingMembership = await prisma.communityMember.findFirst({
      where: { userId },
      include: { community: true },
    });
    if (existingMembership) {
      throw new ConflictException({
        code: 'SINGLE_ORG_VIOLATION',
        message: `You already belong to organization "${existingMembership.community.name}". In Mivo, each user can only belong to one organization.`,
      });
    }

    // 1. Check for slug uniqueness
    const existingSlug = await prisma.community.findUnique({
      where: { slug: input.slug.toLowerCase() },
    });

    if (existingSlug) {
      throw new ConflictException({
        code: 'SLUG_IN_USE',
        message: 'A community with this URL slug already exists. Please pick another.',
      });
    }

    // 2. Transactionally create community, roles, owner membership, and default general channel
    const result = await prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: {
          name: input.name,
          slug: input.slug.toLowerCase(),
          description: input.description,
          iconUrl: input.iconUrl,
          bannerUrl: input.bannerUrl,
          visibility: input.visibility,
          ownerId: userId,
        },
      });

      return community;
    });

    // 3. Initialize system roles
    const { ownerRoleId } = await this.permissionService.initCommunityRoles(result.id);

    // 4. Attach user as Owner member
    await prisma.communityMember.create({
      data: {
        communityId: result.id,
        userId,
        roleId: ownerRoleId,
      },
    });

    // 5. Create default channels and rooms
    const generalChannel = await prisma.channel.create({
      data: {
        communityId: result.id,
        name: 'general',
        topic: 'General discussions and welcome area',
        type: 'GENERAL',
        position: 0,
      },
    });

    await prisma.room.create({
      data: {
        channelId: generalChannel.id,
        name: 'Lobby',
        description: 'Main hangout room',
        activeMode: 'TEXT',
      },
    });

    const voiceChannel = await prisma.channel.create({
      data: {
        communityId: result.id,
        name: 'voice-lounge',
        topic: 'Voice huddles and group calls',
        type: 'VOICE',
        position: 1,
      },
    });

    await prisma.room.create({
      data: {
        channelId: voiceChannel.id,
        name: 'Open Huddle',
        description: 'Drop-in voice room',
        activeMode: 'VOICE',
      },
    });

    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      description: result.description,
      iconUrl: result.iconUrl,
      bannerUrl: result.bannerUrl,
      ownerId: result.ownerId,
      visibility: result.visibility,
      memberCount: 1,
      createdAt: result.createdAt.toISOString(),
    };
  }

  async joinCommunity(communityId: string, userId: string): Promise<CommunityMemberDTO> {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: { roles: { where: { isDefault: true } } },
    });

    if (!community || community.deletedAt) {
      throw new NotFoundException({
        code: 'COMMUNITY_NOT_FOUND',
        message: 'Community not found',
      });
    }

    const defaultRole = community.roles[0];
    if (!defaultRole) {
      throw new ConflictException({
        code: 'ROLE_CONFIG_ERROR',
        message: 'Community does not have a default member role',
      });
    }

    // 0. Single Organization Policy
    const existingMembership = await prisma.communityMember.findFirst({
      where: { userId },
      include: { community: true },
    });

    if (existingMembership) {
      if (existingMembership.communityId === communityId) {
        throw new ConflictException({
          code: 'ALREADY_MEMBER',
          message: 'You are already a member of this community',
        });
      }
      throw new ConflictException({
        code: 'SINGLE_ORG_VIOLATION',
        message: `You already belong to organization "${existingMembership.community.name}". In Mivo, each user can only belong to one organization.`,
      });
    }

    const member = await prisma.communityMember.create({
      data: {
        communityId,
        userId,
        roleId: defaultRole.id,
      },
      include: {
        user: true,
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    return {
      id: member.id,
      communityId: member.communityId,
      userId: member.userId,
      nickname: member.nickname,
      joinedAt: member.joinedAt.toISOString(),
      user: {
        id: member.user.id,
        username: member.user.username,
        displayName: member.user.displayName,
        avatarUrl: member.user.avatarUrl,
        status: member.user.status,
        customStatus: member.user.customStatus,
      },
      role: {
        id: member.role.id,
        communityId: member.role.communityId,
        name: member.role.name,
        color: member.role.color,
        position: member.role.position,
        isDefault: member.role.isDefault,
        isSystem: member.role.isSystem,
        permissions: member.role.permissions.map((rp) => rp.permission.key as PermissionKey),
      },
    };
  }

  async listMembers(communityId: string): Promise<CommunityMemberDTO[]> {
    const members = await prisma.communityMember.findMany({
      where: { communityId },
      include: {
        user: true,
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
      orderBy: [{ role: { position: 'desc' } }, { joinedAt: 'asc' }],
    });

    return members.map((m) => ({
      id: m.id,
      communityId: m.communityId,
      userId: m.userId,
      nickname: m.nickname,
      joinedAt: m.joinedAt.toISOString(),
      user: {
        id: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        status: m.user.status,
        customStatus: m.user.customStatus,
      },
      role: {
        id: m.role.id,
        communityId: m.role.communityId,
        name: m.role.name,
        color: m.role.color,
        position: m.role.position,
        isDefault: m.role.isDefault,
        isSystem: m.role.isSystem,
        permissions: m.role.permissions.map((rp) => rp.permission.key as PermissionKey),
      },
    }));
  }

  async addMember(
    communityId: string,
    actorUserId: string,
    input: AddCommunityMemberInput,
  ): Promise<CommunityMemberDTO> {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: { roles: true },
    });

    if (!community || community.deletedAt) {
      throw new NotFoundException({
        code: 'COMMUNITY_NOT_FOUND',
        message: 'Community not found',
      });
    }

    // Verify actor is owner or has admin/manage permission in this community
    const actorMember = await prisma.communityMember.findFirst({
      where: { userId: actorUserId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const isOwner = community.ownerId === actorUserId;
    const canManage =
      isOwner ||
      (actorMember?.communityId === communityId &&
        (actorMember.role.name === 'Admin' ||
          actorMember.role.name === 'Owner' ||
          actorMember.role.permissions.some((p) => p.permission.key === 'community.manage')));

    if (!canManage) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Only organization owners or administrators can add members.',
      });
    }

    // Find the target user by identifier (email, username, or UUID)
    const trimmed = input.identifier.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    const target = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmed.toLowerCase() },
          { username: trimmed.toLowerCase() },
          ...(isUuid ? [{ id: trimmed }] : []),
        ],
      },
    });

    if (!target) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `No user found matching "${input.identifier}". Please verify the email or username.`,
      });
    }

    // Enforce Single-Org Policy: check if target user already belongs to ANY organization
    const existingOrg = await prisma.communityMember.findFirst({
      where: { userId: target.id },
      include: { community: true },
    });

    if (existingOrg) {
      if (existingOrg.communityId === communityId) {
        throw new ConflictException({
          code: 'ALREADY_MEMBER',
          message: `${target.displayName || target.username} is already a member of this organization.`,
        });
      }
      throw new ConflictException({
        code: 'SINGLE_ORG_VIOLATION',
        message: `${target.displayName || target.username} already belongs to organization "${existingOrg.community.name}". In Mivo, each user can only belong to one organization.`,
      });
    }

    // Determine role
    let targetRoleId = input.roleId;
    if (targetRoleId) {
      const validRole = community.roles.find((r) => r.id === targetRoleId);
      if (!validRole) {
        throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Specified role not found in this community.' });
      }
    } else {
      const defaultRole =
        community.roles.find((r) => r.isDefault) ||
        community.roles.find((r) => r.name === 'Member') ||
        community.roles[0];
      targetRoleId = defaultRole.id;
    }

    const member = await prisma.communityMember.create({
      data: {
        communityId,
        userId: target.id,
        roleId: targetRoleId,
      },
      include: {
        user: true,
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    return {
      id: member.id,
      communityId: member.communityId,
      userId: member.userId,
      nickname: member.nickname,
      joinedAt: member.joinedAt.toISOString(),
      user: {
        id: member.user.id,
        username: member.user.username,
        displayName: member.user.displayName,
        avatarUrl: member.user.avatarUrl,
        status: member.user.status,
        customStatus: member.user.customStatus,
      },
      role: {
        id: member.role.id,
        communityId: member.role.communityId,
        name: member.role.name,
        color: member.role.color,
        position: member.role.position,
        isDefault: member.role.isDefault,
        isSystem: member.role.isSystem,
        permissions: member.role.permissions.map((rp) => rp.permission.key as PermissionKey),
      },
    };
  }

  async removeMember(
    communityId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community || community.deletedAt) {
      throw new NotFoundException({ code: 'COMMUNITY_NOT_FOUND', message: 'Community not found' });
    }

    if (community.ownerId === targetUserId) {
      throw new ConflictException({
        code: 'CANNOT_REMOVE_OWNER',
        message: 'Cannot remove the owner of the organization. Transfer ownership first.',
      });
    }

    const actorMember = await prisma.communityMember.findFirst({
      where: { userId: actorUserId },
      include: { role: true },
    });

    const isSelf = actorUserId === targetUserId;
    const isOwner = community.ownerId === actorUserId;
    const isAdmin = actorMember?.role.name === 'Admin' || actorMember?.role.name === 'Owner';

    if (!isSelf && !isOwner && !isAdmin) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to remove this member.',
      });
    }

    await prisma.communityMember.deleteMany({
      where: { communityId, userId: targetUserId },
    });

    return { success: true, message: 'Member successfully removed from organization.' };
  }

  async listEligibleUsers(communityId: string, search?: string): Promise<EligibleUserDTO[]> {
    // Find all users who are already in any community
    const allAssignedMembers = await prisma.communityMember.findMany({
      select: { userId: true },
    });
    const assignedUserIds = allAssignedMembers.map((m) => m.userId);

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: assignedUserIds },
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: 20,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      status: u.status,
    }));
  }
}

