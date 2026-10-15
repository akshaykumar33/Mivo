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
  async handleRoomChangeMode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomChangeModePayload
  ) {
    const user = client.data?.user;
    if (!user || !data.roomId || !data.activeMode) return;

    await prisma.room.update({
      where: { id: data.roomId },
      data: { activeMode: data.activeMode },
    });

    this.server.to(`room:${data.roomId}`).emit(REALTIME_EVENTS.ROOM_MODE_CHANGED, {
      roomId: data.roomId,
      activeMode: data.activeMode,
      updatedBy: user.sub,
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_UPDATE_MEDIA_STATE)
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

  @SubscribeMessage(REALTIME_EVENTS.SIGNALING_OFFER)
  handleSignalingOffer(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    if (payload.roomId) {
      client.to(`room:${payload.roomId}`).emit(REALTIME_EVENTS.SIGNALING_OFFER, {
        ...payload,
        senderId: client.data.user?.sub,
      });
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.SIGNALING_ANSWER)
  handleSignalingAnswer(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    if (payload.roomId) {
      client.to(`room:${payload.roomId}`).emit(REALTIME_EVENTS.SIGNALING_ANSWER, {
        ...payload,
        senderId: client.data.user?.sub,
      });
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.SIGNALING_ICE_CANDIDATE)
  handleSignalingCandidate(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    if (payload.roomId) {
      client.to(`room:${payload.roomId}`).emit(REALTIME_EVENTS.SIGNALING_ICE_CANDIDATE, {
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
}

