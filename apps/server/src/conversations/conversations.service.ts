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
  DirectThreadDetailsDTO,
  ThreadMetaDTO,
  QuotedDirectMessageDTO,
} from '@mivo/shared';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService
  ) {}

  async listConversations(userId: string): Promise<ConversationDTO[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true },
    });
    if (user?.isGuest) {
      return [];
    }

    const retentionCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
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
          where: {
            deletedAt: null,
            createdAt: { gte: retentionCutoff },
          },
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

  private isRestrictedAccount(u: { isGuest?: boolean; userTier?: string; username?: string; email?: string }): boolean {
    if (u.isGuest || u.userTier === 'GUEST') return true;
    const uname = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return (
      uname.startsWith('guest_') ||
      uname.startsWith('gamer_') ||
      uname.startsWith('test_') ||
      uname.startsWith('creator_') ||
      uname.startsWith('bot_') ||
      email.includes('@guest.mivo.local') ||
      email.includes('@test.mivo.dev') ||
      email.startsWith('test_') ||
      email.startsWith('gamer_') ||
      email.startsWith('creator_')
    );
  }

  async getOrCreateDirectConversation(userId: string, recipientId: string): Promise<ConversationDTO> {
    if (userId === recipientId) {
      throw new BadRequestException({ code: 'CANNOT_DM_SELF', message: 'Cannot start a direct conversation with yourself' });
    }

    const [sender, recipient] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, isGuest: true, userTier: true, username: true, email: true } }),
      prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, isGuest: true, userTier: true, username: true, email: true, deletedAt: true } }),
    ]);

    if (sender?.isGuest || (sender && this.isRestrictedAccount(sender))) {
      throw new ForbiddenException({
        code: 'GUEST_CANNOT_MESSAGE',
        message: 'Guest accounts cannot message other users or start direct conversations. Please sign up or log in.',
      });
    }

    if (!recipient || recipient.deletedAt) {
      throw new NotFoundException({ code: 'RECIPIENT_NOT_FOUND', message: 'Recipient user not found' });
    }

    if (recipient.isGuest || this.isRestrictedAccount(recipient)) {
      throw new BadRequestException({
        code: 'CANNOT_MESSAGE_GUEST',
        message: 'Cannot start conversations with guest or automated accounts.',
      });
    }

    const retentionCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

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
          where: {
            deletedAt: null,
            createdAt: { gte: retentionCutoff },
          },
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
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { isGuest: true, userTier: true, username: true, email: true },
    });
    if (creator?.isGuest || (creator && this.isRestrictedAccount(creator))) {
      throw new ForbiddenException({
        code: 'GUEST_CANNOT_CREATE_GROUP',
        message: 'Guest accounts cannot create group conversations. Please sign up or log in.',
      });
    }

    const uniqueMemberIds = Array.from(new Set([creatorId, ...input.memberIds]));

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueMemberIds }, deletedAt: null },
      select: { id: true, isGuest: true, userTier: true, username: true, email: true },
    });

    if (users.length !== uniqueMemberIds.length) {
      throw new BadRequestException({ code: 'INVALID_MEMBERS', message: 'One or more members could not be found' });
    }

    const restrictedMembers = users.filter((u) => this.isRestrictedAccount(u));
    if (restrictedMembers.length > 0) {
      throw new BadRequestException({
        code: 'CANNOT_ADD_GUEST_TO_GROUP',
        message: 'Guest and automated accounts cannot participate in group conversations.',
      });
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true },
    });
    if (user?.isGuest) {
      throw new ForbiddenException({ code: 'GUEST_RESTRICTED', message: 'Guest accounts cannot access conversations.' });
    }

    const retentionCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: { user: true },
        },
        messages: {
          where: {
            deletedAt: null,
            createdAt: { gte: retentionCutoff },
          },
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true },
    });
    if (user?.isGuest) {
      throw new ForbiddenException({ code: 'GUEST_RESTRICTED', message: 'Guest accounts cannot access conversations.' });
    }

    await this.ensureMembership(conversationId, userId);

    const retentionCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        createdAt: { gte: retentionCutoff },
        OR: [
          { threadId: null },
          { isThreadBroadcast: true },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
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

    return messages.map((m) => this.mapMessageToDTO(m));
  }

  async getThread(conversationId: string, messageId: string, userId: string): Promise<DirectThreadDetailsDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true },
    });
    if (user?.isGuest) {
      throw new ForbiddenException({ code: 'GUEST_RESTRICTED', message: 'Guest accounts cannot access conversations.' });
    }

    await this.ensureMembership(conversationId, userId);

    const rootMessage = await prisma.directMessage.findUnique({
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

    if (!rootMessage || rootMessage.deletedAt || rootMessage.conversationId !== conversationId) {
      throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Thread root message not found in this conversation' });
    }

    const replies = await prisma.directMessage.findMany({
      where: {
        conversationId,
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

  async createMessage(
    conversationId: string,
    senderId: string,
    input: SendDirectMessageInput
  ): Promise<DirectMessageDTO> {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { isGuest: true },
    });
    if (sender?.isGuest) {
      throw new ForbiddenException({
        code: 'GUEST_CANNOT_MESSAGE',
        message: 'Guest accounts cannot send messages. Please sign up or log in.',
      });
    }

    await this.ensureMembership(conversationId, senderId);

    const text = input.content?.trim() || '';
    const attachments = input.attachments && input.attachments.length > 0 ? input.attachments : undefined;
    const replyToId = input.replyToId ? input.replyToId.trim() : undefined;
    const threadId = input.threadId ? input.threadId.trim() : undefined;
    const isThreadBroadcast = !!input.isThreadBroadcast;

    if (replyToId) {
      const parent = await prisma.directMessage.findUnique({ where: { id: replyToId } });
      if (!parent || parent.deletedAt || parent.conversationId !== conversationId) {
        throw new NotFoundException({ code: 'REPLY_TARGET_NOT_FOUND', message: 'Replied message not found' });
      }
    }

    if (threadId) {
      const root = await prisma.directMessage.findUnique({ where: { id: threadId } });
      if (!root || root.deletedAt || root.conversationId !== conversationId) {
        throw new NotFoundException({ code: 'THREAD_ROOT_NOT_FOUND', message: 'Thread root message not found' });
      }
    }

    const message = await prisma.directMessage.create({
      data: {
        conversationId,
        senderId,
        content: text || (attachments ? 'Sent attachments' : ''),
        attachments: attachments as any,
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

    // Touch conversation updated timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const dto = this.mapMessageToDTO(message);

    if (threadId) {
      // Broadcast to thread
      this.realtimeGateway.server.to(`dm:${conversationId}`).emit(REALTIME_EVENTS.DM_THREAD_NEW_MESSAGE, {
        conversationId,
        threadId,
        message: dto,
      });

      // Update parent thread metadata
      const threadMeta = await this.computeDirectThreadMeta(threadId);
      this.realtimeGateway.server.to(`dm:${conversationId}`).emit(REALTIME_EVENTS.DM_THREAD_UPDATED, {
        conversationId,
        threadId,
        threadMeta,
      });

      if (isThreadBroadcast) {
        this.realtimeGateway.server.to(`dm:${conversationId}`).emit(REALTIME_EVENTS.DM_NEW_MESSAGE, dto);
      }
    } else {
      // Broadcast to real-time conversation room
      this.realtimeGateway.server.to(`dm:${conversationId}`).emit(REALTIME_EVENTS.DM_NEW_MESSAGE, dto);
    }

    // Dispatch notification to other conversation members
    const otherMembers = await prisma.conversationMember.findMany({
      where: { conversationId, userId: { not: senderId } },
      include: { conversation: true },
    });

    const senderName = message.sender.displayName || message.sender.username;
    for (const m of otherMembers) {
      const convTitle = m.conversation.type === 'GROUP' ? m.conversation.name || 'Group' : senderName;
      this.notificationsService
        .createNotification(
          m.userId,
          'MESSAGE',
          `New message from ${senderName}`,
          text ? (text.length > 80 ? `${text.slice(0, 80)}...` : text) : 'Sent an attachment',
          conversationId,
          { conversationId, senderId, senderName, conversationTitle: convTitle }
        )
        .catch(() => {});
    }

    return dto;
  }

  private async computeDirectThreadMeta(threadId: string): Promise<ThreadMetaDTO> {
    const replies = await prisma.directMessage.findMany({
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

  private isStatusExpired(expiresAt?: Date | string | null): boolean {
    if (!expiresAt) return false;
    const time = new Date(expiresAt).getTime();
    return !isNaN(time) && time <= Date.now();
  }

  private mapToDTO(conversation: any): ConversationDTO {
    const lastMsg = conversation.messages?.[0] ? this.mapMessageToDTO(conversation.messages[0]) : null;

    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name,
      iconUrl: conversation.iconUrl,
      createdById: conversation.createdById,
      members: conversation.members.map((m: any) => {
        const expired = this.isStatusExpired(m.user?.customStatusExpiresAt);
        return {
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
            customStatus: expired ? null : m.user.customStatus,
            customStatusExpiresAt:
              expired || !m.user.customStatusExpiresAt
                ? null
                : new Date(m.user.customStatusExpiresAt).toISOString(),
          },
        };
      }),
      lastMessage: lastMsg,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private mapMessageToDTO(m: any): DirectMessageDTO {
    const expired = this.isStatusExpired(m.sender?.customStatusExpiresAt);

    let replyTo: QuotedDirectMessageDTO | null = null;
    if (m.replyTo) {
      const replyExpired = this.isStatusExpired(m.replyTo.sender?.customStatusExpiresAt);
      replyTo = {
        id: m.replyTo.id,
        senderId: m.replyTo.senderId,
        content: m.replyTo.content,
        attachments: m.replyTo.attachments,
        createdAt: m.replyTo.createdAt.toISOString(),
        sender: {
          id: m.replyTo.sender.id,
          username: m.replyTo.sender.username,
          displayName: m.replyTo.sender.displayName,
          avatarUrl: m.replyTo.sender.avatarUrl,
          status: m.replyTo.sender.status,
          customStatus: replyExpired ? null : m.replyTo.sender.customStatus,
          customStatusExpiresAt:
            replyExpired || !m.replyTo.sender.customStatusExpiresAt
              ? null
              : new Date(m.replyTo.sender.customStatusExpiresAt).toISOString(),
        },
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
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      attachments: m.attachments,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      replyToId: m.replyToId,
      replyTo,
      threadId: m.threadId,
      isThreadBroadcast: m.isThreadBroadcast,
      threadMeta,
      sender: {
        id: m.sender.id,
        username: m.sender.username,
        displayName: m.sender.displayName,
        avatarUrl: m.sender.avatarUrl,
        status: m.sender.status,
        customStatus: expired ? null : m.sender.customStatus,
        customStatusExpiresAt:
          expired || !m.sender.customStatusExpiresAt
            ? null
            : new Date(m.sender.customStatusExpiresAt).toISOString(),
      },
    };
  }
}
