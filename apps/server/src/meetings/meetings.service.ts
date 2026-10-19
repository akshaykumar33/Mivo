import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { prisma } from '@mivo/database';
import {
  ExternalMeetingDTO,
  ExternalMeetingBridgeDTO,
  ExternalMeetingConfigDTO,
  CreateExternalMeetingInput,
  REALTIME_EVENTS,
  MeetingBridgeActivatedBroadcast,
  MeetingBridgeRemovedBroadcast,
  UserSummaryDTO,
} from '@mivo/shared';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { MessagesService } from '../messages/messages.service.js';
import { ConversationsService } from '../conversations/conversations.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import * as crypto from 'crypto';

@Injectable()
export class MeetingsService {
  // In-memory registry for meetings and active room/conversation bridges
  private meetings = new Map<string, ExternalMeetingDTO>();
  private roomBridges = new Map<string, ExternalMeetingBridgeDTO>();
  private conversationBridges = new Map<string, ExternalMeetingBridgeDTO>();

  constructor(
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    @Inject(forwardRef(() => ConversationsService))
    private conversationsService: ConversationsService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService
  ) {}

  private generateSlug(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateDigits(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  }

  async generateMeeting(
    userId: string,
    input: CreateExternalMeetingInput
  ): Promise<{ meeting: ExternalMeetingDTO; bridge?: ExternalMeetingBridgeDTO }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const userSummary: UserSummaryDTO = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      customStatus: user.customStatus,
    };

    const meetingId = crypto.randomUUID();
    let meetingUrl = '';
    let meetingCode = '';
    let dialIn = '';
    let passcode: string | undefined;
    let conferenceId: string | undefined;

    if (input.provider === 'GOOGLE_MEET') {
      const part1 = this.generateSlug(3);
      const part2 = this.generateSlug(4);
      const part3 = this.generateSlug(3);
      meetingCode = `${part1}-${part2}-${part3}`;
      meetingUrl = `https://meet.google.com/${meetingCode}`;
      const pin = `${this.generateDigits(3)} ${this.generateDigits(3)} ${this.generateDigits(3)}#`;
      dialIn = `+1 415-555-0199 PIN: ${pin}`;
      passcode = this.generateDigits(6);
    } else {
      // MS Teams
      const threadHex = crypto.randomBytes(8).toString('hex');
      const tenantId = process.env.MS_TEAMS_TENANT_ID || '72f988bf-86f1-41af-91ab-2d7cd011db47';
      conferenceId = `${this.generateDigits(3)} ${this.generateDigits(3)} ${this.generateDigits(3)}`;
      meetingCode = conferenceId;
      const context = encodeURIComponent(JSON.stringify({ Tid: tenantId, Oid: user.id }));
      meetingUrl = `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${threadHex}%40thread.v2/0?context=${context}`;
      dialIn = `+1 323-555-0182 Conference ID: ${conferenceId}#`;
      passcode = this.generateDigits(6);
    }

    const meeting: ExternalMeetingDTO = {
      id: meetingId,
      provider: input.provider,
      title: input.title.trim(),
      meetingUrl,
      meetingCode,
      passcode,
      dialIn,
      conferenceId,
      createdBy: userSummary,
      createdAt: new Date().toISOString(),
      scheduledFor: input.scheduledFor,
      status: 'ACTIVE',
      channelId: input.channelId,
      roomId: input.roomId,
      conversationId: input.conversationId,
    };

    this.meetings.set(meetingId, meeting);

    const providerLabel = input.provider === 'GOOGLE_MEET' ? 'Google Meet' : 'Microsoft Teams';

    // If shareToChat is true and roomId is provided, post invite card into the room chat
    if (input.shareToChat && input.roomId) {
      await this.messagesService.createMessage(input.roomId, userId, {
        content: `Created ${providerLabel} Session: **${meeting.title}**\nJoin URL: ${meeting.meetingUrl}`,
        attachments: [
          {
            type: 'external-meeting',
            meeting,
          },
        ],
      });
    }

    // If shareToChat is true and conversationId is provided, post invite card into group conversation
    if (input.shareToChat && input.conversationId) {
      await this.conversationsService.createMessage(input.conversationId, userId, {
        content: `Created ${providerLabel} Session: **${meeting.title}**\nJoin URL: ${meeting.meetingUrl}`,
        attachments: [
          {
            type: 'external-meeting',
            meeting,
          },
        ],
      });
    }

    let bridge: ExternalMeetingBridgeDTO | undefined;

    // If bridgeToRoom is true and roomId is provided, set as the active room bridge
    if (input.bridgeToRoom && input.roomId) {
      bridge = await this.setRoomBridge(input.roomId, meetingId, userId);
    }

    // If bridgeToConversation is true and conversationId is provided, set as the active conversation bridge
    if (input.bridgeToConversation && input.conversationId) {
      bridge = await this.setConversationBridge(input.conversationId, meetingId, userId);
    }

    return { meeting, bridge };
  }

  getMeeting(meetingId: string): ExternalMeetingDTO | undefined {
    return this.meetings.get(meetingId);
  }

  getRoomBridge(roomId: string): ExternalMeetingBridgeDTO | null {
    return this.roomBridges.get(roomId) || null;
  }

  async setRoomBridge(
    roomId: string,
    meetingId: string,
    userId: string
  ): Promise<ExternalMeetingBridgeDTO> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      throw new NotFoundException({
        code: 'MEETING_NOT_FOUND',
        message: 'External meeting not found',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const bridge: ExternalMeetingBridgeDTO = {
      roomId,
      meeting,
      activatedAt: new Date().toISOString(),
      activatedBy: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
        customStatus: user.customStatus,
      },
    };

    this.roomBridges.set(roomId, bridge);

    // Broadcast room bridge activation to room socket channel
    const payload: MeetingBridgeActivatedBroadcast = {
      roomId,
      meeting,
      activatedBy: bridge.activatedBy,
      activatedAt: bridge.activatedAt,
    };
    this.realtimeGateway.server.to(`room:${roomId}`).emit(REALTIME_EVENTS.MEETING_BRIDGE_ACTIVATED, payload);

    // Notify room members asynchronously
    prisma.roomMember
      .findMany({
        where: { roomId, userId: { not: userId } },
      })
      .then((members) => {
        for (const m of members) {
          this.notificationsService
            ?.createNotification(
              m.userId,
              'MEETING',
              `Meeting Started: ${meeting.title}`,
              `${bridge.activatedBy.displayName || bridge.activatedBy.username} started a ${meeting.provider} meeting.`,
              roomId,
              { roomId, meetingId: meeting.id, provider: meeting.provider, meetingUrl: meeting.meetingUrl }
            )
            .catch(() => {});
        }
      })
      .catch(() => {});

    return bridge;
  }

  async removeRoomBridge(roomId: string, userId: string): Promise<{ success: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    this.roomBridges.delete(roomId);

    const payload: MeetingBridgeRemovedBroadcast = {
      roomId,
      removedBy: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
        customStatus: user.customStatus,
      },
      removedAt: new Date().toISOString(),
    };

    this.realtimeGateway.server.to(`room:${roomId}`).emit(REALTIME_EVENTS.MEETING_BRIDGE_REMOVED, payload);

    return { success: true };
  }

  getConversationBridge(conversationId: string): ExternalMeetingBridgeDTO | null {
    return this.conversationBridges.get(conversationId) || null;
  }

  async setConversationBridge(
    conversationId: string,
    meetingId: string,
    userId: string
  ): Promise<ExternalMeetingBridgeDTO> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      throw new NotFoundException({
        code: 'MEETING_NOT_FOUND',
        message: 'External meeting not found',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const bridge: ExternalMeetingBridgeDTO = {
      conversationId,
      meeting,
      activatedAt: new Date().toISOString(),
      activatedBy: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
        customStatus: user.customStatus,
      },
    };

    this.conversationBridges.set(conversationId, bridge);

    // Broadcast conversation bridge activation to conversation socket channel
    const payload: MeetingBridgeActivatedBroadcast = {
      conversationId,
      meeting,
      activatedBy: bridge.activatedBy,
      activatedAt: bridge.activatedAt,
    };
    this.realtimeGateway.server.to(`dm:${conversationId}`).emit(REALTIME_EVENTS.DM_MEETING_BRIDGE_ACTIVATED, payload);

    // Notify other conversation members asynchronously
    prisma.conversationMember
      .findMany({
        where: { conversationId, userId: { not: userId } },
      })
      .then((members) => {
        for (const m of members) {
          this.notificationsService
            ?.createNotification(
              m.userId,
              'MEETING',
              `Meeting in conversation: ${meeting.title}`,
              `${bridge.activatedBy.displayName || bridge.activatedBy.username} started a ${meeting.provider} meeting.`,
              conversationId,
              { conversationId, meetingId: meeting.id, provider: meeting.provider, meetingUrl: meeting.meetingUrl }
            )
            .catch(() => {});
        }
      })
      .catch(() => {});

    return bridge;
  }

  async removeConversationBridge(conversationId: string, userId: string): Promise<{ success: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    this.conversationBridges.delete(conversationId);

    const payload: MeetingBridgeRemovedBroadcast = {
      conversationId,
      removedBy: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
        customStatus: user.customStatus,
      },
      removedAt: new Date().toISOString(),
    };

    this.realtimeGateway.server.to(`dm:${conversationId}`).emit(REALTIME_EVENTS.DM_MEETING_BRIDGE_REMOVED, payload);

    return { success: true };
  }

  getConfig(): ExternalMeetingConfigDTO {
    const hasGoogleOauth = !!process.env.GOOGLE_CLIENT_ID;
    const hasTeamsOauth = !!process.env.MS_TEAMS_CLIENT_ID;

    return {
      google: {
        isConfigured: true,
        mode: hasGoogleOauth ? 'OAUTH_ACTIVE' : 'HYBRID_INSTANT',
        clientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.slice(0, 10)}...` : undefined,
      },
      teams: {
        isConfigured: true,
        mode: hasTeamsOauth ? 'OAUTH_ACTIVE' : 'HYBRID_INSTANT',
        tenantId: process.env.MS_TEAMS_TENANT_ID ? `${process.env.MS_TEAMS_TENANT_ID.slice(0, 8)}...` : undefined,
      },
    };
  }
}
