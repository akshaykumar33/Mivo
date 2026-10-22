import { randomUUID } from 'crypto';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Inject, forwardRef, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PresenceService } from './presence.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AiService } from '../ai/ai.service.js';
import { prisma } from '@mivo/database';
import { SfuEngineService } from './sfu/sfu-engine.service.js';
import { E2eeService } from './e2ee/e2ee.service.js';
import { AmbientFocusService } from './focus/ambient-focus.service.js';
import { MiniAppsService } from './activities/mini-apps.service.js';
import { AiTwinService } from '../ai/ai-twin.service.js';
import {
  REALTIME_EVENTS,
  PresenceHeartbeatPayload,
  PresenceUpdatePayload,
  RoomJoinPayload,
  RoomLeavePayload,
  RoomChangeModePayload,
  RoomUpdateMediaStatePayload,
  RoomMemberDTO,
  MessageDTO,
  DirectMessageDTO,
} from '@mivo/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly roomJoinLocks = new Set<string>();
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private presenceService: PresenceService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => AiService))
    private aiService: AiService,
    @Inject(forwardRef(() => AiTwinService))
    private aiTwinService: AiTwinService,
    private sfuEngine: SfuEngineService,
    private e2eeService: E2eeService,
    private ambientFocusService: AmbientFocusService,
    private miniAppsService: MiniAppsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization ||
        (client.handshake.query?.token as string);

      if (!authHeader) {
        client.disconnect();
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, '');
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_32chars_min',
      });

      client.data.user = payload;
      client.data.rooms = new Set<string>();
      client.join(`user:${payload.sub}`);

      // Query current user status from DB
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { status: true, customStatus: true, customStatusExpiresAt: true },
      });

      const isExpired =
        dbUser?.customStatusExpiresAt && new Date(dbUser.customStatusExpiresAt).getTime() <= Date.now();
      const effectiveCustomStatus = isExpired ? null : dbUser?.customStatus || null;
      const effectiveExpiresAt = isExpired
        ? null
        : dbUser?.customStatusExpiresAt
        ? dbUser.customStatusExpiresAt.toISOString()
        : null;
      const effectiveStatus = dbUser?.status && dbUser.status !== 'OFFLINE' ? dbUser.status : 'ONLINE';

      this.presenceService.setUserOnline(
        payload.sub,
        client.id,
        effectiveStatus,
        effectiveCustomStatus,
        effectiveExpiresAt
      );

      client.emit(REALTIME_EVENTS.CONNECTION_ACK, {
        userId: payload.sub,
        status: effectiveStatus,
        customStatus: effectiveCustomStatus,
        customStatusExpiresAt: effectiveExpiresAt,
        timestamp: new Date().toISOString(),
      });

      // Broadcast presence update
      this.server.emit(REALTIME_EVENTS.PRESENCE_USER_UPDATED, {
        userId: payload.sub,
        status: effectiveStatus,
        customStatus: effectiveCustomStatus,
        customStatusExpiresAt: effectiveExpiresAt,
      });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user?.sub) {
      const isFullyOffline = await this.presenceService.setUserOffline(user.sub, client.id);
      
      // Clean up room memberships for this socket session
      const joinedRooms = Array.from((client.data?.rooms as Set<string>) || []);
      if (isFullyOffline && joinedRooms.length > 0) {
        for (const roomId of joinedRooms) {
          try {
            await prisma.roomMember.deleteMany({
              where: { roomId, userId: user.sub },
            });
            this.server.to(`room:${roomId}`).emit(REALTIME_EVENTS.ROOM_PARTICIPANT_LEFT, {
              roomId,
              userId: user.sub,
              reason: 'Disconnected',
            });
          } catch {}
        }
      }

      if (isFullyOffline) {
        this.server.emit(REALTIME_EVENTS.PRESENCE_USER_UPDATED, {
          userId: user.sub,
          status: 'OFFLINE',
          customStatus: null,
          customStatusExpiresAt: null,
        });
      }
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.PRESENCE_HEARTBEAT)
  async handleHeartbeat(@ConnectedSocket() client: Socket, @MessageBody() data: PresenceHeartbeatPayload) {
    const user = client.data?.user;
    if (!user) return;
    await this.presenceService.heartbeat(
      user.sub,
      data.status,
      data.customStatus,
      data.customStatusExpiresAt
    );
  }

  @SubscribeMessage(REALTIME_EVENTS.PRESENCE_UPDATE)
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PresenceUpdatePayload
  ) {
    const user = client.data?.user;
    if (!user) return { success: false, error: 'Unauthorized' };

    const cleanCustomStatus = data.customStatus
      ? data.customStatus.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\u200E\u200B]/gu, '').replace(/\s+/g, ' ').trim() || null
      : data.customStatus === null
      ? null
      : undefined;

    const updated = await this.presenceService.updateUserPresence(
      user.sub,
      data.status,
      cleanCustomStatus,
      data.customStatusExpiresAt
    );

    this.server.emit(REALTIME_EVENTS.PRESENCE_USER_UPDATED, {
      userId: user.sub,
      status: updated.status,
      customStatus: updated.customStatus,
      customStatusExpiresAt: updated.customStatusExpiresAt,
    });

    return { success: true, data: updated };
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_JOIN)
  async handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() data: RoomJoinPayload) {
    const user = client.data?.user;
    if (!user || !data.roomId) return;

    const roomId = data.roomId;
    client.join(`room:${roomId}`);
    if (!client.data.rooms) client.data.rooms = new Set<string>();
    client.data.rooms.add(roomId);

    const lockKey = `${roomId}:${user.sub}`;
    if (this.roomJoinLocks.has(lockKey)) {
      return;
    }
    this.roomJoinLocks.add(lockKey);

    try {
      // Atomic upsert at PostgreSQL level to guarantee 0 race conditions on (roomId, userId)
      const newMemberId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "room_members" ("id", "roomId", "userId", "joinedAt", "isMuted", "isDeafened", "isCameraOn", "isScreenOn")
        VALUES (${newMemberId}::uuid, ${roomId}::uuid, ${user.sub}::uuid, NOW(), false, false, false, false)
        ON CONFLICT ("roomId", "userId")
        DO UPDATE SET "joinedAt" = NOW()
      `;

      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId: user.sub } },
        include: { user: true, room: true },
      });

      if (!member) return;

      const isExpired = (exp?: Date | null) => exp && exp.getTime() <= Date.now();

      const participantDTO: RoomMemberDTO = {
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
          customStatus: isExpired(member.user.customStatusExpiresAt) ? null : member.user.customStatus,
          customStatusExpiresAt: isExpired(member.user.customStatusExpiresAt) || !member.user.customStatusExpiresAt ? null : member.user.customStatusExpiresAt.toISOString(),
        },
      };

      // Notify others in room
      client.to(`room:${roomId}`).emit(REALTIME_EVENTS.ROOM_PARTICIPANT_JOINED, {
        roomId,
        participant: participantDTO,
      });

      // Send full room state snapshot back to the joiner
      const allRoomMembers = await prisma.roomMember.findMany({
        where: { roomId },
        include: { user: true },
      });

      client.emit(REALTIME_EVENTS.ROOM_JOINED, {
        roomId,
        activeMode: member.room.activeMode,
        members: allRoomMembers.map((m) => {
          const exp = isExpired(m.user.customStatusExpiresAt);
          return {
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
              customStatus: exp ? null : m.user.customStatus,
              customStatusExpiresAt: exp || !m.user.customStatusExpiresAt ? null : m.user.customStatusExpiresAt.toISOString(),
            },
          };
        }),
      });
    } catch (err: any) {
      this.logger.error(`Error in handleRoomJoin for user ${user?.sub} in room ${roomId}: ${err.message}`);
    } finally {
      this.roomJoinLocks.delete(lockKey);
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_LEAVE)
  async handleRoomLeave(@ConnectedSocket() client: Socket, @MessageBody() data: RoomLeavePayload) {
    const user = client.data?.user;
    if (!user || !data.roomId) return;

    const roomId = data.roomId;
    client.leave(`room:${roomId}`);
    client.data?.rooms?.delete(roomId);

    await prisma.roomMember.deleteMany({
      where: { roomId, userId: user.sub },
    });

    this.server.to(`room:${roomId}`).emit(REALTIME_EVENTS.ROOM_PARTICIPANT_LEFT, {
      roomId,
      userId: user.sub,
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_CHANGE_MODE)
  @SubscribeMessage('room:mode_change_request')
  async handleRoomChangeMode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    const user = client.data?.user;
    const activeMode = data?.activeMode || data?.mode;
    if (!user || !data?.roomId || !activeMode) return;

    await prisma.room.update({
      where: { id: data.roomId },
      data: { activeMode },
    });

    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_MODE_CHANGED, {
      roomId: data.roomId,
      activeMode,
      updatedBy: user.sub,
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_UPDATE_MEDIA_STATE)
  @SubscribeMessage('room:participant_state')
  async handleMediaState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomUpdateMediaStatePayload
  ) {
    const user = client.data?.user;
    if (!user || !data.roomId) return;

    const updated = await prisma.roomMember.update({
      where: { roomId_userId: { roomId: data.roomId, userId: user.sub } },
      data: {
        ...(data.isMuted !== undefined && { isMuted: data.isMuted }),
        ...(data.isDeafened !== undefined && { isDeafened: data.isDeafened }),
        ...(data.isCameraOn !== undefined && { isCameraOn: data.isCameraOn }),
        ...(data.isScreenOn !== undefined && { isScreenOn: data.isScreenOn }),
      },
    });

    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_PARTICIPANT_STATE_UPDATED, {
      roomId: data.roomId,
      userId: user.sub,
      isMuted: updated.isMuted,
      isDeafened: updated.isDeafened,
      isCameraOn: updated.isCameraOn,
      isScreenOn: updated.isScreenOn,
    });
  }

  private getSignalingTarget(payload: any, client: Socket): string | null {
    if (payload.conversationId) return `call:${payload.conversationId}`;
    if (payload.roomId) {
      if (
        payload.roomId.startsWith('call:') ||
        payload.roomId.startsWith('room:') ||
        payload.roomId.startsWith('dm:')
      ) {
        return payload.roomId;
      }
      if (client.rooms.has(`call:${payload.roomId}`)) {
        return `call:${payload.roomId}`;
      }
      return `room:${payload.roomId}`;
    }
    return null;
  }

  @SubscribeMessage(REALTIME_EVENTS.SIGNALING_OFFER)
  handleSignalingOffer(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    const targetRoom = this.getSignalingTarget(payload, client);
    if (targetRoom) {
      client.to(targetRoom).emit(REALTIME_EVENTS.SIGNALING_OFFER, {
        ...payload,
        senderId: client.data.user?.sub,
      });
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.SIGNALING_ANSWER)
  handleSignalingAnswer(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    const targetRoom = this.getSignalingTarget(payload, client);
    if (targetRoom) {
      client.to(targetRoom).emit(REALTIME_EVENTS.SIGNALING_ANSWER, {
        ...payload,
        senderId: client.data.user?.sub,
      });
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.SIGNALING_ICE_CANDIDATE)
  handleSignalingCandidate(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    const targetRoom = this.getSignalingTarget(payload, client);
    if (targetRoom) {
      client.to(targetRoom).emit(REALTIME_EVENTS.SIGNALING_ICE_CANDIDATE, {
        ...payload,
        senderId: client.data.user?.sub,
      });
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_HOST_ACTION)
  async handleHostAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    const user = client.data?.user;
    if (!user || !data.roomId || !data.targetUserId) return;

    if (data.action === 'MUTE') {
      await prisma.roomMember.updateMany({
        where: { roomId: data.roomId, userId: data.targetUserId },
        data: { isMuted: true },
      });

      this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_PARTICIPANT_STATE_UPDATED, {
        roomId: data.roomId,
        userId: data.targetUserId,
        isMuted: true,
        isDeafened: false,
        isCameraOn: false,
        isScreenOn: false,
      });
    } else if (data.action === 'KICK') {
      await prisma.roomMember.deleteMany({
        where: { roomId: data.roomId, userId: data.targetUserId },
      });

      this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_PARTICIPANT_LEFT, {
        roomId: data.roomId,
        userId: data.targetUserId,
        reason: data.reason || 'Removed by host',
      });
    } else if (data.action === 'TRANSFER_HOST') {
      this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_HOST_TRANSFERRED, {
        roomId: data.roomId,
        oldHostUserId: user.sub,
        newHostUserId: data.newHostUserId || data.targetUserId,
      });
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_RECORDING_START)
  handleRecordingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data.roomId) return;

    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_RECORDING_STATE_CHANGED, {
      roomId: data.roomId,
      isRecording: true,
      hostName: user.displayName || user.username || 'Host',
      startedAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_RECORDING_STOP)
  handleRecordingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data.roomId) return;

    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_RECORDING_STATE_CHANGED, {
      roomId: data.roomId,
      isRecording: false,
      hostName: user.displayName || user.username || 'Host',
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.CHAT_TYPING)
  handleChatTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data.roomId) return;

    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.CHAT_TYPING, {
      roomId: data.roomId,
      userId: user.sub,
      username: user.displayName || user.username || 'Someone',
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.CHAT_STOP_TYPING)
  handleChatStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data.roomId) return;

    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.CHAT_STOP_TYPING, {
      roomId: data.roomId,
      userId: user.sub,
      username: user.displayName || user.username || 'Someone',
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.CHAT_SEND_MESSAGE)
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content?: string; attachments?: any[] }
  ) {
    const user = client.data?.user;
    if (!user || !data?.roomId) {
      return { success: false, error: 'Unauthorized or missing room ID' };
    }

    const trimmedContent = data.content?.trim() || '';
    if (!trimmedContent && (!data.attachments || data.attachments.length === 0)) {
      return { success: false, error: 'Message content or attachments required' };
    }

    try {
      const room = await prisma.room.findUnique({
        where: { id: data.roomId },
      });

      if (!room || room.deletedAt) {
        return { success: false, error: 'Room not found' };
      }

      const message = await prisma.message.create({
        data: {
          roomId: data.roomId,
          senderId: user.sub,
          content: trimmedContent || (data.attachments?.length ? 'Sent attachments' : ''),
          attachments: data.attachments || undefined,
        },
        include: {
          sender: true,
        },
      });

      const isExpired = (exp?: Date | null) => exp && exp.getTime() <= Date.now();
      const expired = isExpired(message.sender.customStatusExpiresAt);

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
          customStatus: expired ? null : message.sender.customStatus,
          customStatusExpiresAt:
            expired || !message.sender.customStatusExpiresAt
              ? null
              : message.sender.customStatusExpiresAt.toISOString(),
        },
      };

      this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.CHAT_NEW_MESSAGE, dto);

      return { success: true, data: dto };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to process message' };
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.CHAT_REACTION_ADD)
  handleChatReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; messageId: string; emoji: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.roomId || !data?.messageId || !data?.emoji) return;

    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.CHAT_REACTION_ADDED, {
      roomId: data.roomId,
      messageId: data.messageId,
      emoji: data.emoji,
      userId: user.sub,
    });
  }

  // -------------------------------------------------------------
  // Direct & Group Messaging
  // -------------------------------------------------------------

  @SubscribeMessage(REALTIME_EVENTS.DM_JOIN)
  async handleDmJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.conversationId) {
      return { success: false, error: 'Unauthorized or missing conversationId' };
    }

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId: user.sub,
        },
      },
    });

    if (!member) {
      return { success: false, error: 'Not a member of this conversation' };
    }

    client.join(`dm:${data.conversationId}`);
    return { success: true, conversationId: data.conversationId };
  }

  @SubscribeMessage(REALTIME_EVENTS.DM_LEAVE)
  handleDmLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    if (data?.conversationId) {
      client.leave(`dm:${data.conversationId}`);
    }
    return { success: true };
  }

  @SubscribeMessage(REALTIME_EVENTS.DM_SEND_MESSAGE)
  async handleDmSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content?: string; attachments?: any[] }
  ) {
    const user = client.data?.user;
    if (!user || !data?.conversationId) {
      return { success: false, error: 'Unauthorized or missing conversationId' };
    }

    const trimmedContent = data.content?.trim() || '';
    if (!trimmedContent && (!data.attachments || data.attachments.length === 0)) {
      return { success: false, error: 'Message content or attachments required' };
    }

    try {
      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: data.conversationId,
            userId: user.sub,
          },
        },
      });

      if (!member) {
        return { success: false, error: 'Not a member of this conversation' };
      }

      const message = await prisma.directMessage.create({
        data: {
          conversationId: data.conversationId,
          senderId: user.sub,
          content: trimmedContent || (data.attachments?.length ? 'Sent attachments' : ''),
          attachments: data.attachments || undefined,
        },
        include: {
          sender: true,
        },
      });

      await prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      });

      const isExpired = (exp?: Date | null) => exp && exp.getTime() <= Date.now();
      const expired = isExpired(message.sender.customStatusExpiresAt);

      const dto: DirectMessageDTO = {
        id: message.id,
        conversationId: message.conversationId,
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
          customStatus: expired ? null : message.sender.customStatus,
          customStatusExpiresAt:
            expired || !message.sender.customStatusExpiresAt
              ? null
              : message.sender.customStatusExpiresAt.toISOString(),
        },
      };

      // Emit to conversation room
      this.server.to(`dm:${data.conversationId}`).emit(REALTIME_EVENTS.DM_NEW_MESSAGE, dto);

      // Also deliver to individual member rooms for notification badges
      const members = await prisma.conversationMember.findMany({
        where: { conversationId: data.conversationId },
        select: { userId: true },
      });

      for (const m of members) {
        this.server.to(`user:${m.userId}`).emit(REALTIME_EVENTS.DM_NEW_MESSAGE, dto);
      }

      return { success: true, data: dto };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send direct message' };
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.DM_TYPING)
  handleDmTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.conversationId) return;

    client.to(`dm:${data.conversationId}`).emit(REALTIME_EVENTS.DM_TYPING, {
      conversationId: data.conversationId,
      userId: user.sub,
      username: user.username || user.displayName || 'Someone',
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.DM_STOP_TYPING)
  handleDmStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.conversationId) return;

    client.to(`dm:${data.conversationId}`).emit(REALTIME_EVENTS.DM_STOP_TYPING, {
      conversationId: data.conversationId,
      userId: user.sub,
      username: user.username || user.displayName || 'Someone',
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.DM_REACTION_ADD)
  handleDmReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; messageId: string; emoji: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.conversationId || !data?.messageId || !data?.emoji) return;

    this.server.to(`dm:${data.conversationId}`).emit(REALTIME_EVENTS.DM_REACTION_ADDED, {
      conversationId: data.conversationId,
      messageId: data.messageId,
      emoji: data.emoji,
      userId: user.sub,
    });
  }

  // -------------------------------------------------------------
  // Audio Calling (Direct & Group Levels)
  // -------------------------------------------------------------

  @SubscribeMessage(REALTIME_EVENTS.CALL_INVITE)
  async handleCallInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; recipientId?: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.conversationId) {
      return { success: false, error: 'Unauthorized or missing conversationId' };
    }

    try {
      const conv = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
        include: {
          members: {
            include: { user: true },
          },
        },
      });

      if (!conv || conv.deletedAt) {
        return { success: false, error: 'Conversation not found' };
      }

      const isMember = conv.members.some((m) => m.userId === user.sub);
      if (!isMember) {
        return { success: false, error: 'Not a member of this conversation' };
      }

      const callerUser = conv.members.find((m) => m.userId === user.sub)?.user;
      const callerName = callerUser?.displayName || callerUser?.username || 'User';
      const callerAvatar = callerUser?.avatarUrl || null;

      // Caller joins the call room
      client.join(`call:${data.conversationId}`);

      const broadcastPayload = {
        conversationId: data.conversationId,
        callerId: user.sub,
        callerName,
        callerAvatar,
        isGroup: conv.type === 'GROUP',
        groupName: conv.name,
      };

      // Notify other members
      const otherMembers = conv.members.filter((m) => m.userId !== user.sub);
      for (const m of otherMembers) {
        this.server.to(`user:${m.userId}`).emit(REALTIME_EVENTS.CALL_INCOMING, broadcastPayload);
        this.notificationsService
          ?.createNotification(
            m.userId,
            'CALL',
            `Incoming Call from ${callerName}`,
            conv.type === 'GROUP' ? `Group voice call in ${conv.name || 'group conversation'}` : 'Incoming voice call',
            data.conversationId,
            { conversationId: data.conversationId, callerId: user.sub, callerName, isGroup: conv.type === 'GROUP' }
          )
          .catch(() => {});
      }

      return { success: true, conversationId: data.conversationId };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to initiate call' };
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.CALL_ACCEPT)
  async handleCallAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.conversationId) {
      return { success: false, error: 'Unauthorized or missing conversationId' };
    }

    client.join(`call:${data.conversationId}`);

    const currentUser = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    // Notify participants in call that user joined
    this.server.to(`call:${data.conversationId}`).emit(REALTIME_EVENTS.CALL_PARTICIPANT_JOINED, {
      conversationId: data.conversationId,
      userId: user.sub,
      user: currentUser,
    });

    this.server.to(`call:${data.conversationId}`).emit(REALTIME_EVENTS.CALL_ACCEPTED, {
      conversationId: data.conversationId,
      userId: user.sub,
    });

    return { success: true };
  }

  @SubscribeMessage(REALTIME_EVENTS.CALL_DECLINE)
  handleCallDecline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.conversationId) return { success: false };

    this.server.to(`call:${data.conversationId}`).emit(REALTIME_EVENTS.CALL_DECLINED, {
      conversationId: data.conversationId,
      userId: user.sub,
    });

    return { success: true };
  }

  @SubscribeMessage(REALTIME_EVENTS.CALL_END)
  handleCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.conversationId) return { success: false };

    client.leave(`call:${data.conversationId}`);

    this.server.to(`call:${data.conversationId}`).emit(REALTIME_EVENTS.CALL_PARTICIPANT_LEFT, {
      conversationId: data.conversationId,
      userId: user.sub,
    });

    this.server.to(`call:${data.conversationId}`).emit(REALTIME_EVENTS.CALL_ENDED, {
      conversationId: data.conversationId,
      reason: 'Call ended',
    });

    return { success: true };
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_AI_AGENT_ACTION)
  async handleRoomAiAgentAction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      query: string;
      roomName: string;
      attendees: string[];
      recentTranscript?: Array<{ speaker: string; text: string; time?: string }>;
      communityId?: string;
    }
  ) {
    const user = client.data?.user;
    if (!user || !data?.roomId) return { success: false };

    // Broadcast that AI Co-Host is actively thinking
    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_AI_AGENT_RESPONSE, {
      roomId: data.roomId,
      status: 'THINKING',
      query: data.query,
    });

    try {
      const result = await this.aiService.processStageAgentCommand(
        data.query,
        data.roomName || 'Stage',
        data.attendees || [],
        data.recentTranscript || [],
        data.communityId
      );

      // Broadcast the AI response, voice speech text, and pinned data tile to all room members
      this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_AI_AGENT_RESPONSE, {
        roomId: data.roomId,
        status: 'SPEAKING',
        query: data.query,
        speechText: result.speechText,
        pinnedTile: result.pinnedTile,
        factCheckAlert: result.factCheckAlert,
        engine: result.engine,
      });

      if (result.shouldPinTile && result.pinnedTile) {
        this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_AI_PIN_TILE, {
          roomId: data.roomId,
          pinnedTile: result.pinnedTile,
        });
      }

      if (result.factCheckAlert) {
        this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_AI_FACT_CHECK, {
          roomId: data.roomId,
          alert: result.factCheckAlert,
        });
      }

      return { success: true, data: result };
    } catch (err: any) {
      this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_AI_AGENT_RESPONSE, {
        roomId: data.roomId,
        status: 'IDLE',
        error: err.message,
      });
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_AI_DISMISS_TILE)
  handleDismissPinnedTile(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    if (!data?.roomId) return;
    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_AI_DISMISS_TILE, {
      roomId: data.roomId,
    });
  }

  // ---------------------------------------------------------------------------
  // 🎨 CANVAS / COLLABORATIVE WHITEBOARD & FLOWCHART STAGE
  // ---------------------------------------------------------------------------

  @SubscribeMessage(REALTIME_EVENTS.ROOM_CANVAS_UPDATE)
  handleCanvasUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    if (!data?.roomId) return;
    // Broadcast updates to other participants in the room
    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_CANVAS_UPDATE, data);
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_CANVAS_CURSOR)
  handleCanvasCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    if (!data?.roomId) return;
    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_CANVAS_CURSOR, data);
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_CANVAS_CLEAR)
  handleCanvasClear(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    if (!data?.roomId) return;
    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_CANVAS_CLEAR, data);
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_CANVAS_AI_GENERATE)
  async handleCanvasAiGenerate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; prompt: string }
  ) {
    if (!data?.roomId || !data?.prompt) return;
    try {
      const result = await this.aiService.generateCanvasArchitecture(data.prompt);
      this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_CANVAS_UPDATE, {
        roomId: data.roomId,
        elements: result.elements,
        action: 'UPSERT',
        summary: result.summary,
        updatedBy: 'Mivo AI Architect',
      });
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ---------------------------------------------------------------------------
  // 🎧 3D SPATIAL AUDIO & DYNAMIC PHYSICS GRID
  // ---------------------------------------------------------------------------

  @SubscribeMessage(REALTIME_EVENTS.ROOM_SPATIAL_AUDIO_UPDATE)
  handleSpatialAudioUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    if (!data?.roomId) return;
    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_SPATIAL_AUDIO_UPDATE, data);
  }

  // ---------------------------------------------------------------------------
  // ⚡ SPOKEN VOICE-TO-TICKET AUTOMATION
  // ---------------------------------------------------------------------------

  @SubscribeMessage(REALTIME_EVENTS.ROOM_VOICE_TICKET_CONFIRM)
  async handleVoiceTicketConfirm(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ): Promise<any> {
    const user = client.data.user;
    if (!user || !data?.roomId || !data?.ticketProposal) return;

    try {
      // Find assignee user if name was suggested
      let assigneeId: string | undefined = undefined;
      if (data.ticketProposal.suggestedAssignee) {
        const matched = await prisma.user.findFirst({
          where: {
            OR: [
              { displayName: { contains: data.ticketProposal.suggestedAssignee, mode: 'insensitive' } },
              { username: { contains: data.ticketProposal.suggestedAssignee, mode: 'insensitive' } },
            ],
          },
        });
        if (matched) assigneeId = matched.id;
      }

      // Create the ticket in PostgreSQL
      const createdTicket = await prisma.ticket.create({
        data: {
          title: data.ticketProposal.title,
          description: data.ticketProposal.description || data.ticketProposal.title,
          priority: data.ticketProposal.priority,
          category: data.ticketProposal.category || 'Engineering',
          creatorId: user.sub,
          assigneeId: assigneeId,
          communityId: data.ticketProposal.communityId,
          status: 'OPEN',
        },
        include: { assignee: true, creator: true },
      });

      // Broadcast ticket created announcement to the room
      this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_AI_AGENT_RESPONSE, {
        roomId: data.roomId,
        status: 'SPEAKING',
        query: 'Confirm Ticket Creation',
        speechText: `Ticket #${createdTicket.id.slice(0, 8)} "${createdTicket.title}" has been registered in the database with ${createdTicket.priority} priority.`,
        createdTicket,
      });

      return { success: true, data: createdTicket };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ===========================================================================
  // 1. ⚡ MEDIA PLANE: SFU ENGINE (Mediasoup / LiveKit Architecture)
  // ===========================================================================

  @SubscribeMessage(REALTIME_EVENTS.SFU_GET_ROUTER_RTP_CAPABILITIES)
  handleSfuGetRtpCapabilities(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    if (!data?.roomId) return { success: false, error: 'Missing roomId' };
    const rtpCapabilities = this.sfuEngine.getRtpCapabilities(data.roomId);
    return { success: true, data: rtpCapabilities };
  }

  @SubscribeMessage(REALTIME_EVENTS.SFU_CREATE_TRANSPORT)
  handleSfuCreateTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; direction: 'send' | 'recv' }
  ) {
    const user = client.data?.user;
    if (!user || !data?.roomId) return { success: false, error: 'Unauthorized or missing roomId' };
    const transportOptions = this.sfuEngine.createTransport(data.roomId, user.sub, data.direction || 'send');
    return { success: true, data: transportOptions };
  }

  @SubscribeMessage(REALTIME_EVENTS.SFU_CONNECT_TRANSPORT)
  handleSfuConnectTransport(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { roomId: string; transportId: string; dtlsParameters: any }
  ) {
    if (!data?.roomId || !data?.transportId) return { success: false, error: 'Invalid parameters' };
    const connected = this.sfuEngine.connectTransport(data.roomId, data.transportId, data.dtlsParameters);
    return { success: connected };
  }

  @SubscribeMessage(REALTIME_EVENTS.SFU_PRODUCE)
  handleSfuProduce(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; kind: 'audio' | 'video'; simulcast?: boolean; initialLayer?: any }
  ) {
    const user = client.data?.user;
    if (!user || !data?.roomId || !data?.kind) return { success: false, error: 'Invalid parameters' };
    const producer = this.sfuEngine.produce(data.roomId, user.sub, data.kind, data.simulcast, data.initialLayer);
    
    // Broadcast producer to other room participants so they can consume it
    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.SFU_PRODUCE, {
      roomId: data.roomId,
      producer,
      userId: user.sub,
    });

    return { success: true, data: producer };
  }

  @SubscribeMessage(REALTIME_EVENTS.SFU_CONSUME)
  handleSfuConsume(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; producerId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.roomId || !data?.producerId) return { success: false, error: 'Invalid parameters' };
    const consumer = this.sfuEngine.consume(data.roomId, user.sub, data.producerId);
    return { success: !!consumer, data: consumer };
  }

  @SubscribeMessage(REALTIME_EVENTS.SFU_SET_PREFERRED_LAYERS)
  handleSfuSetPreferredLayers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; consumerId: string; spatialLayer: number }
  ) {
    if (!data?.roomId || !data?.consumerId) return { success: false };
    const consumer = this.sfuEngine.setPreferredLayers(data.roomId, data.consumerId, data.spatialLayer);
    return { success: !!consumer, data: consumer };
  }

  @SubscribeMessage(REALTIME_EVENTS.SFU_STATS_UPDATE)
  handleSfuStats(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { roomId: string; participantCount?: number }
  ) {
    if (!data?.roomId) return { success: false };
    const stats = this.sfuEngine.getRoomStats(data.roomId, data.participantCount);
    return { success: true, data: stats };
  }

  @SubscribeMessage(REALTIME_EVENTS.SFU_MODE_SWITCH)
  handleSfuModeSwitch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; mode: 'SFU_ROUTER' | 'P2P_MESH' }
  ) {
    if (!data?.roomId || !data?.mode) return { success: false };
    const newMode = this.sfuEngine.toggleEngineMode(data.roomId, data.mode);
    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.SFU_MODE_SWITCH, {
      roomId: data.roomId,
      mode: newMode,
    });
    return { success: true, mode: newMode };
  }

  // ===========================================================================
  // 2. 🛡️ MEDIA PLANE: END-TO-END ENCRYPTION (E2EE)
  // ===========================================================================

  @SubscribeMessage(REALTIME_EVENTS.E2EE_KEY_EXCHANGE)
  handleE2eeKeyExchange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    if (!data?.roomId) return { success: false };
    const relayed = this.e2eeService.relayKeyPackage(data);
    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.E2EE_KEY_EXCHANGE, relayed);
    return { success: true };
  }

  @SubscribeMessage(REALTIME_EVENTS.E2EE_EPOCH_ROTATED)
  handleE2eeEpochRotated(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.roomId) return { success: false };
    const rotated = this.e2eeService.rotateEpoch(data.roomId, user.sub);
    const safetyCode = this.e2eeService.getSafetyCode(data.roomId, rotated.epoch);

    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.E2EE_EPOCH_ROTATED, {
      roomId: data.roomId,
      rotated,
      safetyCode,
    });

    return { success: true, data: { rotated, safetyCode } };
  }

  @SubscribeMessage(REALTIME_EVENTS.E2EE_VERIFY_SAFETY_CODE)
  handleE2eeVerifySafetyCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; epoch?: number }
  ) {
    const user = client.data?.user;
    if (!data?.roomId) return { success: false };
    if (user?.sub) {
      this.e2eeService.verifyParticipant(data.roomId, user.sub);
    }
    const safetyCode = this.e2eeService.getSafetyCode(data.roomId, data.epoch);
    return { success: true, data: safetyCode };
  }

  // ===========================================================================
  // 3. 💻 DEVELOPER DX: CODE_STAGE PAIR-PROGRAMMING SANDBOX
  // ===========================================================================

  @SubscribeMessage(REALTIME_EVENTS.CODE_STAGE_CHANGE)
  handleCodeStageChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    if (!data?.roomId) return;
    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.CODE_STAGE_CHANGE, data);
  }

  @SubscribeMessage(REALTIME_EVENTS.CODE_STAGE_CURSOR)
  handleCodeStageCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    if (!data?.roomId) return;
    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.CODE_STAGE_CURSOR, data);
  }

  @SubscribeMessage(REALTIME_EVENTS.CODE_STAGE_EXECUTE)
  handleCodeStageExecute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    if (!data?.roomId) return;
    client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.CODE_STAGE_EXECUTE, data);
  }

  // ===========================================================================
  // 4. 🤖 PRESENCE: AI TWIN & OUT OF OFFICE PERSONA
  // ===========================================================================

  @SubscribeMessage(REALTIME_EVENTS.AI_TWIN_AUTO_REPLY)
  async handleAiTwinAutoReply(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientUserId: string; message: string; channelId?: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.recipientUserId) return { success: false };
    try {
      const reply = await this.aiTwinService.generateAutoReply(data.recipientUserId, user.sub, data.message);
      if (data.channelId) {
        this.server.to(`channel:${data.channelId}`).emit(REALTIME_EVENTS.CHAT_NEW_MESSAGE, {
          id: `msg_twin_${Date.now()}`,
          channelId: data.channelId,
          senderId: data.recipientUserId,
          content: reply.replyContent,
          isAiTwin: true,
          proposedCallbackSlot: reply.proposedCallbackSlot,
          createdAt: new Date().toISOString(),
        });
      }
      return { success: true, data: reply };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.AI_TWIN_SCHEDULE_CALLBACK)
  async handleAiTwinScheduleCallback(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientUserId: string; slot: string; communityId?: string }
  ) {
    const user = client.data?.user;
    if (!user || !data?.recipientUserId || !data?.slot) return { success: false };
    try {
      const result = await this.aiTwinService.scheduleCallback(data.recipientUserId, user.sub, data.slot, data.communityId);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ===========================================================================
  // 5. 🎧 VIBE & FLOW: AMBIENT SPATIAL FOCUS ROOMS & POMODORO
  // ===========================================================================

  @SubscribeMessage(REALTIME_EVENTS.FOCUS_TIMER_SYNC)
  handleFocusTimerSync(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    if (!data?.roomId) return { success: false };
    const state = this.ambientFocusService.getOrCreateState(data.roomId);
    return { success: true, data: state };
  }

  @SubscribeMessage(REALTIME_EVENTS.FOCUS_TIMER_ACTION)
  handleFocusTimerAction(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { roomId: string; action: 'START' | 'PAUSE' | 'RESET' | 'START_BREAK'; durationMinutes?: number }
  ) {
    if (!data?.roomId || !data?.action) return { success: false };
    const state = this.ambientFocusService.handleTimerAction(data.roomId, data.action, data.durationMinutes);
    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.FOCUS_TIMER_SYNC, state);
    return { success: true, data: state };
  }

  @SubscribeMessage(REALTIME_EVENTS.FOCUS_TRACK_CHANGE)
  handleFocusTrackChange(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { roomId: string; track: any; volume?: number; spatial?: number }
  ) {
    if (!data?.roomId || !data?.track) return { success: false };
    const state = this.ambientFocusService.setAmbientTrack(data.roomId, data.track, data.volume, data.spatial);
    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.FOCUS_TIMER_SYNC, state);
    return { success: true, data: state };
  }

  // ===========================================================================
  // 6. 🧩 EXTENSIBILITY: MIVO MINI-APPS / ACTIVITY SANDBOXES
  // ===========================================================================

  @SubscribeMessage(REALTIME_EVENTS.ACTIVITY_LAUNCH)
  handleActivityLaunch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; type: any; initialPayload?: any }
  ) {
    const user = client.data?.user;
    if (!user || !data?.roomId || !data?.type) return { success: false };
    const activity = this.miniAppsService.launchActivity(data.roomId, data.type, user.sub, data.initialPayload);
    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ACTIVITY_LAUNCH, activity);
    return { success: true, data: activity };
  }

  @SubscribeMessage(REALTIME_EVENTS.ACTIVITY_ACTION)
  handleActivityAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; actionType: string; payload: any }
  ) {
    const user = client.data?.user;
    if (!user || !data?.roomId || !data?.actionType) return { success: false };
    const updated = this.miniAppsService.handleAction(data.roomId, user.sub, data.actionType, data.payload);
    if (updated) {
      client.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ACTIVITY_SYNC_STATE, updated);
    }
    return { success: true, data: updated };
  }

  @SubscribeMessage(REALTIME_EVENTS.ACTIVITY_CLOSE)
  handleActivityClose(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    if (!data?.roomId) return { success: false };
    const closed = this.miniAppsService.closeActivity(data.roomId);
    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ACTIVITY_CLOSE, { roomId: data.roomId });
    return { success: closed };
  }
}


