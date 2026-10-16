import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PresenceService } from './presence.service.js';
import { prisma } from '@mivo/database';
import {
  REALTIME_EVENTS,
  PresenceHeartbeatPayload,
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
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private presenceService: PresenceService
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
      this.presenceService.setUserOnline(payload.sub, client.id);

      client.emit(REALTIME_EVENTS.CONNECTION_ACK, {
        userId: payload.sub,
        timestamp: new Date().toISOString(),
      });

      // Broadcast presence update
      this.server.emit(REALTIME_EVENTS.PRESENCE_USER_UPDATED, {
        userId: payload.sub,
        status: 'ONLINE',
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
        });
      }
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.PRESENCE_HEARTBEAT)
  async handleHeartbeat(@ConnectedSocket() client: Socket, @MessageBody() data: PresenceHeartbeatPayload) {
    const user = client.data?.user;
    if (!user) return;
    await this.presenceService.heartbeat(user.sub, data.status, data.customStatus);
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_JOIN)
  async handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() data: RoomJoinPayload) {
    const user = client.data?.user;
    if (!user || !data.roomId) return;

    const roomId = data.roomId;
    client.join(`room:${roomId}`);
    if (!client.data.rooms) client.data.rooms = new Set<string>();
    client.data.rooms.add(roomId);

    // Create or update room membership in DB
    let member: any;
    try {
      member = await prisma.roomMember.upsert({
        where: { roomId_userId: { roomId, userId: user.sub } },
        update: { joinedAt: new Date() },
        create: { roomId, userId: user.sub },
        include: { user: true, room: true },
      });
    } catch (err) {
      member = await prisma.roomMember.findFirst({
        where: { roomId, userId: user.sub },
        include: { user: true, room: true },
      });
    }
    if (!member) return;

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
        customStatus: member.user.customStatus,
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
      members: allRoomMembers.map((m) => ({
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
      })),
    });
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
          customStatus: message.sender.customStatus,
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
}

