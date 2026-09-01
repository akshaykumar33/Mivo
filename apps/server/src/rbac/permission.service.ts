import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { prisma } from '@mivo/database';
import {
  PERMISSIONS,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_MODERATOR_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_GUEST_PERMISSIONS,
  SYSTEM_ROLE_NAMES,
  CreateRoleInput,
  UpdateRoleInput,
  RoleDTO,
  PermissionKey,
} from '@mivo/shared';

@Injectable()
export class PermissionService {
  async initCommunityRoles(communityId: string): Promise<{ ownerRoleId: string; defaultRoleId: string }> {
    // 1. Fetch all system permissions from DB
    const allPermissions = await prisma.permission.findMany();
    const permMap = new Map(allPermissions.map((p) => [p.key, p.id]));

    // Helper to connect permission IDs
    const getPermConnect = (keys: PermissionKey[]) =>
      keys
        .map((k) => permMap.get(k))
        .filter((id): id is string => Boolean(id))
        .map((id) => ({ permissionId: id }));

    // Owner Role
    const ownerRole = await prisma.role.create({
      data: {
        communityId,
        name: SYSTEM_ROLE_NAMES.OWNER,
        color: '#EAB308', // Gold
        position: 100,
        isSystem: true,
        isDefault: false,
        permissions: { create: getPermConnect(DEFAULT_OWNER_PERMISSIONS) },
      },
    });

    // Admin Role
    await prisma.role.create({
      data: {
        communityId,
        name: SYSTEM_ROLE_NAMES.ADMIN,
        color: '#EC4899', // Pink/Rose
        position: 80,
        isSystem: true,
        isDefault: false,
        permissions: { create: getPermConnect(DEFAULT_ADMIN_PERMISSIONS) },
      },
    });

    // Moderator Role
    await prisma.role.create({
      data: {
        communityId,
        name: SYSTEM_ROLE_NAMES.MODERATOR,
        color: '#3B82F6', // Blue
        position: 50,
        isSystem: true,
        isDefault: false,
        permissions: { create: getPermConnect(DEFAULT_MODERATOR_PERMISSIONS) },
      },
    });

    // Member Role (Default)
    const memberRole = await prisma.role.create({
      data: {
        communityId,
        name: SYSTEM_ROLE_NAMES.MEMBER,
        color: '#10B981', // Emerald
        position: 10,
        isSystem: true,
        isDefault: true,
        permissions: { create: getPermConnect(DEFAULT_MEMBER_PERMISSIONS) },
      },
    });

    // Guest Role
    await prisma.role.create({
      data: {
        communityId,
        name: SYSTEM_ROLE_NAMES.GUEST,
        color: '#94A3B8', // Slate
        position: 0,
        isSystem: true,
        isDefault: false,
        permissions: { create: getPermConnect(DEFAULT_GUEST_PERMISSIONS) },
      },
    });

    return {
      ownerRoleId: ownerRole.id,
      defaultRoleId: memberRole.id,
    };
  }

  async getCommunityRoles(communityId: string): Promise<RoleDTO[]> {
    const roles = await prisma.role.findMany({
      where: { communityId },
      orderBy: { position: 'desc' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      communityId: r.communityId,
      name: r.name,
      color: r.color,
      position: r.position,
      isDefault: r.isDefault,
      isSystem: r.isSystem,
      permissions: r.permissions.map((rp) => rp.permission.key as PermissionKey),
    }));
  }

  async createRole(communityId: string, input: CreateRoleInput): Promise<RoleDTO> {
    const allPermissions = await prisma.permission.findMany({
      where: { key: { in: input.permissions } },
    });

    const role = await prisma.role.create({
      data: {
        communityId,
        name: input.name,
        color: input.color || '#7C3AED',
        position: input.position ?? 1,
        permissions: {
          create: allPermissions.map((p) => ({ permissionId: p.id })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    return {
      id: role.id,
      communityId: role.communityId,
      name: role.name,
      color: role.color,
      position: role.position,
      isDefault: role.isDefault,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission.key as PermissionKey),
    };
  }

  async updateRole(roleId: string, input: UpdateRoleInput): Promise<RoleDTO> {
    const existing = await prisma.role.findUnique({ where: { id: roleId } });
    if (!existing) {
      throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    }

    if (existing.isSystem && input.name && input.name !== existing.name) {
      throw new ForbiddenException({
        code: 'IMMUTABLE_ROLE',
        message: 'System role names cannot be modified',
      });
    }

    // Update basic fields
    await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.position !== undefined && { position: input.position }),
      },
    });

    // Update permissions if provided
    if (input.permissions) {
      const perms = await prisma.permission.findMany({
        where: { key: { in: input.permissions } },
      });

      await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId } }),
        prisma.rolePermission.createMany({
          data: perms.map((p) => ({ roleId, permissionId: p.id })),
        }),
      ]);
    }

    const updated = await prisma.role.findUniqueOrThrow({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });

    return {
      id: updated.id,
      communityId: updated.communityId,
      name: updated.name,
      color: updated.color,
      position: updated.position,
      isDefault: updated.isDefault,
      isSystem: updated.isSystem,
      permissions: updated.permissions.map((rp) => rp.permission.key as PermissionKey),
    };
  }

  async assignMemberRole(communityId: string, userId: string, roleId: string): Promise<void> {
    const role = await prisma.role.findFirst({
      where: { id: roleId, communityId },
    });

    if (!role) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: 'Role not found in this community',
      });
    }

    await prisma.communityMember.update({
      where: { communityId_userId: { communityId, userId } },
      data: { roleId },
    });
  }
}
