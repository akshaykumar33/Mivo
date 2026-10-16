import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { prisma } from '@mivo/database';
import {
  ConversationDTO,
  DirectMessageDTO,
  CreateGroupConversationInput,
  SendDirectMessageInput,
  REALTIME_EVENTS,
} from '@mivo/shared';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway
  ) {}

  async listConversations(userId: string): Promise<ConversationDTO[]> {
    const conversations = await prisma.conversation.findMany({
      where: {
        deletedAt: null,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((c) => this.mapToDTO(c));
  }

  async getOrCreateDirectConversation(userId: string, recipientId: string): Promise<ConversationDTO> {
    if (userId === recipientId) {
      throw new BadRequestException({ code: 'CANNOT_DM_SELF', message: 'Cannot start a direct conversation with yourself' });
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });
    if (!recipient || recipient.deletedAt) {
      throw new NotFoundException({ code: 'RECIPIENT_NOT_FOUND', message: 'Recipient user not found' });
    }

    // Look for an existing DIRECT conversation containing both users
    const existing = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        deletedAt: null,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: recipientId } } },
        ],
      },
      include: {
        members: {
          include: { user: true },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: true },
        },
      },
    });

    if (existing) {
      return this.mapToDTO(existing);
    }

    // Create new DIRECT conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        createdById: userId,
        members: {
          create: [
            { userId },
            { userId: recipientId },
          ],
        },
      },
      include: {
        members: {
          include: { user: true },
        },
        messages: {
          take: 0,
        },
      },
    });

    return this.mapToDTO(conversation);
  }

  async createGroupConversation(creatorId: string, input: CreateGroupConversationInput): Promise<ConversationDTO> {
    const uniqueMemberIds = Array.from(new Set([creatorId, ...input.memberIds]));

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueMemberIds }, deletedAt: null },
    });

    if (users.length !== uniqueMemberIds.length) {
      throw new BadRequestException({ code: 'INVALID_MEMBERS', message: 'One or more members could not be found' });
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: 'GROUP',
        name: input.name.trim(),
        iconUrl: input.iconUrl || null,
        createdById: creatorId,
        members: {
          create: uniqueMemberIds.map((uid) => ({ userId: uid })),
        },
      },
      include: {
        members: {
          include: { user: true },
        },
        messages: {
          take: 0,
        },
      },
    });

    const dto = this.mapToDTO(conversation);

    // Broadcast conversation creation to members
    uniqueMemberIds.forEach((uid) => {
      this.realtimeGateway.server.to(`user:${uid}`).emit('conversation:created', dto);
    });

    return dto;
  }

  async getConversation(conversationId: string, userId: string): Promise<ConversationDTO> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: { user: true },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: true },
        },
      },
    });

    if (!conversation || conversation.deletedAt) {
      throw new NotFoundException({ code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' });
    }

    const isMember = conversation.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException({ code: 'NOT_CONVERSATION_MEMBER', message: 'You are not a member of this conversation' });
    }

    return this.mapToDTO(conversation);
  }

  async listMessages(conversationId: string, userId: string, limit = 50): Promise<DirectMessageDTO[]> {
    await this.ensureMembership(conversationId, userId);

    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
      },
    });

    return messages.map((m) => this.mapMessageToDTO(m));
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    input: SendDirectMessageInput
  ): Promise<DirectMessageDTO> {
    await this.ensureMembership(conversationId, senderId);

    const text = input.content?.trim() || '';
    const attachments = input.attachments && input.attachments.length > 0 ? input.attachments : undefined;

    const message = await prisma.directMessage.create({
      data: {
        conversationId,
        senderId,
        content: text || (attachments ? 'Sent attachments' : ''),
        attachments: attachments as any,
      },
      include: {
        sender: true,
      },
    });

    // Touch conversation updated timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const dto = this.mapMessageToDTO(message);

    // Broadcast to real-time conversation room
    this.realtimeGateway.server.to(`dm:${conversationId}`).emit(REALTIME_EVENTS.DM_NEW_MESSAGE, dto);

    return dto;
  }

  private async ensureMembership(conversationId: string, userId: string) {
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException({ code: 'NOT_CONVERSATION_MEMBER', message: 'You are not a member of this conversation' });
    }
  }

  private mapToDTO(conversation: any): ConversationDTO {
    const lastMsg = conversation.messages?.[0] ? this.mapMessageToDTO(conversation.messages[0]) : null;

    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name,
      iconUrl: conversation.iconUrl,
      createdById: conversation.createdById,
      members: conversation.members.map((m: any) => ({
        id: m.id,
        conversationId: m.conversationId,
        userId: m.userId,
        joinedAt: m.joinedAt.toISOString(),
        lastReadAt: m.lastReadAt ? m.lastReadAt.toISOString() : null,
        user: {
          id: m.user.id,
          username: m.user.username,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl,
          status: m.user.status,
          customStatus: m.user.customStatus,
        },
      })),
      lastMessage: lastMsg,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private mapMessageToDTO(m: any): DirectMessageDTO {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      attachments: m.attachments,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      sender: {
        id: m.sender.id,
        username: m.sender.username,
        displayName: m.sender.displayName,
        avatarUrl: m.sender.avatarUrl,
        status: m.sender.status,
        customStatus: m.sender.customStatus,
      },
    };
  }
}
