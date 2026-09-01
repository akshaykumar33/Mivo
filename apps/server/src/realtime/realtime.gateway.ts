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
      const authHeader = client.handshake.headers.authorization || client.handshake.auth?.token;
      if (!authHeader) {
        client.disconnect();
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, '');
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_32chars_min',
      });

      client.data.user = payload;
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

  handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user?.sub) {
      const isFullyOffline = this.presenceService.setUserOffline(user.sub, client.id);
      if (isFullyOffline) {
        this.server.emit(REALTIME_EVENTS.PRESENCE_USER_UPDATED, {
          userId: user.sub,
          status: 'OFFLINE',
        });
      }
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.PRESENCE_HEARTBEAT)
  handleHeartbeat(@ConnectedSocket() client: Socket, @MessageBody() data: PresenceHeartbeatPayload) {
    const user = client.data?.user;
    if (!user) return;
    this.presenceService.heartbeat(user.sub, data.status, data.customStatus);
  }

  @SubscribeMessage(REALTIME_EVENTS.ROOM_JOIN)
  async handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() data: RoomJoinPayload) {
    const user = client.data?.user;
    if (!user || !data.roomId) return;

    const roomId = data.roomId;
    client.join(`room:${roomId}`);

    // Create or update room membership in DB
    const member = await prisma.roomMember.upsert({
      where: { roomId_userId: { roomId, userId: user.sub } },
      update: { joinedAt: new Date() },
      create: { roomId, userId: user.sub },
      include: { user: true, room: true },
    });

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
}
