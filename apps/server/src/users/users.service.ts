import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { UpdateProfileInput, UserDTO } from '@mivo/shared';

@Injectable()
export class UsersService {
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

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      customStatus: user.customStatus,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDTO> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName && { displayName: input.displayName }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
        ...(input.customStatus !== undefined && { customStatus: input.customStatus }),
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      bannerUrl: updated.bannerUrl,
      bio: updated.bio,
      customStatus: updated.customStatus,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      lastSeenAt: updated.lastSeenAt ? updated.lastSeenAt.toISOString() : null,
    };
  }
}
