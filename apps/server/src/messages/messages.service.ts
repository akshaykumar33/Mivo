import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { MessageDTO, SendMessageInput, REALTIME_EVENTS, ThreadDetailsDTO, ThreadMetaDTO, QuotedMessageDTO } from '@mivo/shared';
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
        OR: [
          { threadId: null },
          { isThreadBroadcast: true },
        ],
      },
      include: {
        sender: true,
        replyTo: {
          include: { sender: true },
        },
        threadReplies: {
          where: { deletedAt: null },
          include: { sender: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { threadReplies: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map((m) => this.mapMessageToDTO(m));
  }

  async getThread(roomId: string, messageId: string): Promise<ThreadDetailsDTO> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room || room.deletedAt) {
      throw new NotFoundException({
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    const rootMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        replyTo: {
          include: { sender: true },
        },
        threadReplies: {
          where: { deletedAt: null },
          include: { sender: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { threadReplies: { where: { deletedAt: null } } },
        },
      },
    });

    if (!rootMessage || rootMessage.deletedAt || rootMessage.roomId !== roomId) {
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Thread root message not found in this room',
      });
    }

    const replies = await prisma.message.findMany({
      where: {
        roomId,
        threadId: messageId,
        deletedAt: null,
      },
      include: {
        sender: true,
        replyTo: {
          include: { sender: true },
        },
        threadReplies: {
          where: { deletedAt: null },
          include: { sender: true },
          take: 1,
        },
        _count: {
          select: { threadReplies: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      rootMessage: this.mapMessageToDTO(rootMessage),
      replies: replies.map((r) => this.mapMessageToDTO(r)),
    };
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

    const replyToId = input.replyToId ? input.replyToId.trim() : undefined;
    const threadId = input.threadId ? input.threadId.trim() : undefined;
    const isThreadBroadcast = !!input.isThreadBroadcast;

    // Validate WhatsApp quote-reply target if provided
    if (replyToId) {
      const parentMsg = await prisma.message.findUnique({
        where: { id: replyToId },
      });
      if (!parentMsg || parentMsg.deletedAt || parentMsg.roomId !== roomId) {
        throw new NotFoundException({
          code: 'REPLY_TARGET_NOT_FOUND',
          message: 'The message being replied to was not found.',
        });
      }
    }

    // Validate Slack thread root message if provided
    if (threadId) {
      const threadRoot = await prisma.message.findUnique({
        where: { id: threadId },
      });
      if (!threadRoot || threadRoot.deletedAt || threadRoot.roomId !== roomId) {
        throw new NotFoundException({
          code: 'THREAD_ROOT_NOT_FOUND',
          message: 'Thread root message was not found.',
        });
      }
    }

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: userId,
        content: input.content.trim(),
        attachments: input.attachments || undefined,
        replyToId,
        threadId,
        isThreadBroadcast,
      },
      include: {
        sender: true,
        replyTo: {
          include: { sender: true },
        },
        threadReplies: {
          where: { deletedAt: null },
          include: { sender: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { threadReplies: { where: { deletedAt: null } } },
        },
      },
    });

    const dto = this.mapMessageToDTO(message);

    // If message is sent inside a Slack-style thread:
    if (threadId) {
      // Broadcast new thread message to room channel
      this.realtimeGateway.server.to(`room:${roomId}`).emit(REALTIME_EVENTS.CHAT_THREAD_NEW_MESSAGE, {
        roomId,
        threadId,
        message: dto,
      });

      // Compute and emit updated thread stats to update parent badge
      const threadMeta = await this.computeThreadMeta(threadId);
      this.realtimeGateway.server.to(`room:${roomId}`).emit(REALTIME_EVENTS.CHAT_THREAD_UPDATED, {
        roomId,
        threadId,
        threadMeta,
      });

      // If user toggled Slack "Also send to channel", broadcast to main room stream
      if (isThreadBroadcast) {
        this.realtimeGateway.server.to(`room:${roomId}`).emit(REALTIME_EVENTS.CHAT_NEW_MESSAGE, dto);
      }
    } else {
      // Standard room message (includes WhatsApp replies in main chat)
      this.realtimeGateway.server.to(`room:${roomId}`).emit(REALTIME_EVENTS.CHAT_NEW_MESSAGE, dto);
    }

    return dto;
  }

  private async computeThreadMeta(threadId: string): Promise<ThreadMetaDTO> {
    const replies = await prisma.message.findMany({
      where: { threadId, deletedAt: null },
      select: {
        createdAt: true,
        sender: {
          select: {
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const replyCount = replies.length;
    const lastReplyAt = replies[0]?.createdAt ? replies[0].createdAt.toISOString() : null;
    const participantAvatars = Array.from(
      new Set(replies.map((r) => r.sender?.avatarUrl).filter(Boolean) as string[])
    );

    return {
      replyCount,
      lastReplyAt,
      participantAvatars,
      participantCount: participantAvatars.length,
    };
  }

  private mapMessageToDTO(m: any): MessageDTO {
    let replyTo: QuotedMessageDTO | null = null;
    if (m.replyTo) {
      replyTo = {
        id: m.replyTo.id,
        senderId: m.replyTo.senderId,
        content: m.replyTo.content,
        attachments: m.replyTo.attachments as any,
        createdAt: m.replyTo.createdAt.toISOString(),
        sender: m.replyTo.sender
          ? {
              id: m.replyTo.sender.id,
              username: m.replyTo.sender.username,
              displayName: m.replyTo.sender.displayName,
              avatarUrl: m.replyTo.sender.avatarUrl,
              status: m.replyTo.sender.status,
              customStatus: m.replyTo.sender.customStatus,
              customStatusExpiresAt: m.replyTo.sender.customStatusExpiresAt
                ? m.replyTo.sender.customStatusExpiresAt.toISOString()
                : null,
            }
          : undefined,
      };
    }

    let threadMeta: ThreadMetaDTO | null = null;
    const replyCount = m._count?.threadReplies || 0;
    if (replyCount > 0) {
      const lastReply = m.threadReplies?.[0];
      const participantAvatars = Array.from(
        new Set(
          (m.threadReplies || [])
            .map((r: any) => r.sender?.avatarUrl)
            .filter(Boolean) as string[]
        )
      );
      threadMeta = {
        replyCount,
        lastReplyAt: lastReply?.createdAt ? new Date(lastReply.createdAt).toISOString() : null,
        participantAvatars,
        participantCount: participantAvatars.length,
      };
    }

    return {
      id: m.id,
      roomId: m.roomId,
      senderId: m.senderId,
      content: m.content,
      attachments: m.attachments as any,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      replyToId: m.replyToId,
      replyTo,
      threadId: m.threadId,
      isThreadBroadcast: m.isThreadBroadcast,
      threadMeta,
      sender: m.sender
        ? {
            id: m.sender.id,
            username: m.sender.username,
            displayName: m.sender.displayName,
            avatarUrl: m.sender.avatarUrl,
            status: m.sender.status,
            customStatus: m.sender.customStatus,
            customStatusExpiresAt: m.sender.customStatusExpiresAt
              ? m.sender.customStatusExpiresAt.toISOString()
              : null,
          }
        : undefined,
    };
  }
}
