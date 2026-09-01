import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './require-permissions.decorator.js';
import { PermissionKey } from '@mivo/shared';
import { prisma } from '@mivo/database';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.sub) {
      throw new ForbiddenException({
        code: 'UNAUTHORIZED',
        message: 'User authentication required',
      });
    }

    // Extract communityId from params or body
    const communityId = request.params?.communityId || request.body?.communityId;
    if (!communityId) {
      // If no community context, pass or fail depending on route context
      return true;
    }

    // 1. Check if user is community owner
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { ownerId: true },
    });

    if (!community) {
      return true; // Let controller handle 404
    }

    if (community.ownerId === user.sub) {
      return true; // Owner has all permissions
    }

    // 2. Fetch member and associated role permissions
    const member = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: user.sub,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!member || !member.role) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You are not a member of this community',
      });
    }

    const memberPermissions = new Set(
      member.role.permissions.map((rp) => rp.permission.key)
    );

    const hasAll = requiredPermissions.every((req) => memberPermissions.has(req));
    if (!hasAll) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have the required permissions for this action',
        details: requiredPermissions
          .filter((req) => !memberPermissions.has(req))
          .map((req) => ({ issue: `Missing permission: ${req}` })),
      });
    }

    return true;
  }
}
