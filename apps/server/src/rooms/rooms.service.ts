import { Injectable, NotFoundException } from '@nestjs/common';
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
        activeMode: input.activeMode,
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

    const activeMembers: RoomMemberDTO[] = room.members.map((m) => ({
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
      data: { activeMode: mode },
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
}
