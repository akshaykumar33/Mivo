import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { MessageDTO, SendMessageInput, REALTIME_EVENTS } from '@mivo/shared';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway
  ) {}

  async listMessages(roomId: string, limit = 50): Promise<MessageDTO[]> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room || room.deletedAt) {
      throw new NotFoundException({
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    // Auto-disappearing retention: exclude messages older than 1 year (365 days)
    const retentionCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null,
        createdAt: { gte: retentionCutoff },
      },
      include: {
        sender: true,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map((m) => ({
      id: m.id,
      roomId: m.roomId,
      senderId: m.senderId,
      content: m.content,
      attachments: m.attachments as any,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      sender: {
        id: m.sender.id,
        username: m.sender.username,
        displayName: m.sender.displayName,
        avatarUrl: m.sender.avatarUrl,
        status: m.sender.status,
        customStatus: m.sender.customStatus,
        customStatusExpiresAt: m.sender.customStatusExpiresAt ? m.sender.customStatusExpiresAt.toISOString() : null,
      },
    }));
  }

  async createMessage(roomId: string, userId: string, input: SendMessageInput): Promise<MessageDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true },
    });

    if (user?.isGuest) {
      throw new ForbiddenException({
        code: 'GUEST_CANNOT_MESSAGE',
        message: 'Guest accounts cannot send messages to others. Please create an account or sign in.',
      });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room || room.deletedAt) {
      throw new NotFoundException({
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: userId,
        content: input.content.trim(),
        attachments: input.attachments || undefined,
      },
      include: {
        sender: true,
      },
    });

    const dto: MessageDTO = {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      content: message.content,
      attachments: message.attachments as any,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      sender: {
        id: message.sender.id,
        username: message.sender.username,
        displayName: message.sender.displayName,
        avatarUrl: message.sender.avatarUrl,
        status: message.sender.status,
        customStatus: message.sender.customStatus,
        customStatusExpiresAt: message.sender.customStatusExpiresAt ? message.sender.customStatusExpiresAt.toISOString() : null,
      },
    };

    // Broadcast in real time to everyone connected to this room
    this.realtimeGateway.server.to(`room:${roomId}`).emit(REALTIME_EVENTS.CHAT_NEW_MESSAGE, dto);

    return dto;
  }
}
