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

    const existingMember = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });

    if (existingMember) {
      throw new ConflictException({
        code: 'ALREADY_MEMBER',
        message: 'You are already a member of this community',
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
}
