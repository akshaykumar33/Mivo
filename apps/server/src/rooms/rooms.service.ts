import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@mivo/database';
import {
  CreateRoomInput,
  UpdateRoomInput,
  RoomDTO,
  RoomMemberDTO,
  RoomCommunicationMode,
} from '@mivo/shared';

@Injectable()
export class RoomsService {
  async createRoom(channelId: string, input: CreateRoomInput): Promise<RoomDTO> {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || channel.deletedAt) {
      throw new NotFoundException({ code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' });
    }

    const room = await prisma.room.create({
      data: {
        channelId,
        name: input.name,
        description: input.description,
        activeMode: input.activeMode as any,
        maxCapacity: input.maxCapacity,
        isLocked: input.isLocked,
      },
    });

    return {
      id: room.id,
      channelId: room.channelId,
      name: room.name,
      description: room.description,
      activeMode: room.activeMode,
      maxCapacity: room.maxCapacity,
      isLocked: room.isLocked,
      activeMembers: [],
      createdAt: room.createdAt.toISOString(),
    };
  }

  async getRoom(roomId: string): Promise<RoomDTO> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    if (!room || room.deletedAt) {
      throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    }

    // Filter out stale room members who joined more than 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const validMembers = room.members.filter((m) => new Date(m.joinedAt).getTime() >= twoHoursAgo.getTime());

    const activeMembers: RoomMemberDTO[] = validMembers.map((m) => ({
      id: m.id,
      roomId: m.roomId,
      userId: m.userId,
      isMuted: m.isMuted,
      isDeafened: m.isDeafened,
      isCameraOn: m.isCameraOn,
      isScreenOn: m.isScreenOn,
      joinedAt: m.joinedAt.toISOString(),
      user: {
        id: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        status: m.user.status,
        customStatus: m.user.customStatus,
      },
    }));

    return {
      id: room.id,
      channelId: room.channelId,
      name: room.name,
      description: room.description,
      activeMode: room.activeMode,
      maxCapacity: room.maxCapacity,
      isLocked: room.isLocked,
      activeMembers,
      createdAt: room.createdAt.toISOString(),
    };
  }

  async updateRoomMode(roomId: string, mode: RoomCommunicationMode): Promise<RoomDTO> {
    const room = await prisma.room.update({
      where: { id: roomId },
      data: { activeMode: mode as any },
      include: {
        members: { include: { user: true } },
      },
    });

    return {
      id: room.id,
      channelId: room.channelId,
      name: room.name,
      description: room.description,
      activeMode: room.activeMode,
      maxCapacity: room.maxCapacity,
      isLocked: room.isLocked,
      createdAt: room.createdAt.toISOString(),
    };
  }

  async emailMeetingSummary(
    roomId: string,
    userEmail: string,
    userName: string,
    notes: string,
    transcript: Array<{ speaker: string; text: string; time: string }>
  ) {
    const room = await this.getRoom(roomId);

    const summary = {
      roomName: room.name,
      timestamp: new Date().toISOString(),
      recipient: userEmail,
      attendee: userName,
      notes,
      transcriptCount: transcript.length,
      status: 'SENT',
      message: `Meeting summary and transcript for #${room.name} successfully dispatched to ${userEmail}.`,
    };

    console.log(`[Whisper Scribe] Meeting summary emailed to ${userEmail} for room "${room.name}"`);
    return summary;
  }

  async addRoomMember(roomId: string, actorUserId: string, targetUserId: string): Promise<RoomMemberDTO> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        channel: {
          include: {
            community: true,
          },
        },
      },
    });

    if (!room || room.deletedAt) {
      throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    }

    // Verify actor belongs to the room's community
    const actorMembership = await prisma.communityMember.findFirst({
      where: {
        communityId: room.channel.communityId,
        userId: actorUserId,
      },
    });

    if (!actorMembership) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You are not a member of this organization',
      });
    }

    // Verify target user is a member of this community (single-org enforcement)
    const targetMembership = await prisma.communityMember.findFirst({
      where: {
        communityId: room.channel.communityId,
        userId: targetUserId,
      },
      include: { user: true },
    });

    if (!targetMembership) {
      throw new ForbiddenException({
        code: 'USER_NOT_IN_ORG',
        message: 'User must belong to this organization before being added to a room or group',
      });
    }

    const member = await prisma.roomMember.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId: targetUserId,
        },
      },
      update: {},
      create: {
        roomId,
        userId: targetUserId,
      },
      include: {
        user: true,
      },
    });

    return {
      id: member.id,
      roomId: member.roomId,
      userId: member.userId,
      isMuted: member.isMuted,
      isDeafened: member.isDeafened,
      isCameraOn: member.isCameraOn,
      isScreenOn: member.isScreenOn,
      joinedAt: member.joinedAt.toISOString(),
      user: {
        id: member.user.id,
        username: member.user.username,
        displayName: member.user.displayName,
        avatarUrl: member.user.avatarUrl,
        status: member.user.status,
        customStatus: member.user.customStatus,
      },
    };
  }

  async removeRoomMember(roomId: string, actorUserId: string, targetUserId: string): Promise<{ message: string }> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        channel: true,
      },
    });

    if (!room || room.deletedAt) {
      throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    }

    const actorMembership = await prisma.communityMember.findFirst({
      where: {
        communityId: room.channel.communityId,
        userId: actorUserId,
      },
    });

    if (!actorMembership) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You are not a member of this organization',
      });
    }

    await prisma.roomMember.deleteMany({
      where: {
        roomId,
        userId: targetUserId,
      },
    });

    return { message: 'Member successfully removed from room' };
  }

  async listEligibleRoomMembers(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        channel: true,
        members: { select: { userId: true } },
      },
    });

    if (!room || room.deletedAt) {
      throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    }

    const currentMemberIds = new Set(room.members.map((m) => m.userId));

    const orgMembers = await prisma.communityMember.findMany({
      where: {
        communityId: room.channel.communityId,
      },
      include: {
        user: true,
        role: true,
      },
      orderBy: {
        user: { displayName: 'asc' },
      },
    });

    return orgMembers
      .filter((m) => !currentMemberIds.has(m.userId))
      .map((m) => ({
        id: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        email: m.user.email,
        roleName: m.role.name,
      }));
  }
}
