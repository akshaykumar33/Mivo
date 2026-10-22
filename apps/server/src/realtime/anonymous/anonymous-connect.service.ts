import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import {
  REALTIME_EVENTS,
  AnonQueueJoinPayload,
  AnonMatchedPayload,
  AnonMessagePayload,
  AnonMessageBroadcast,
} from '@mivo/shared';

interface QueueEntry {
  socketId: string;
  userId: string;
  mode: 'TEXT' | 'VIDEO';
  interests: string[];
  pseudonym: string;
  avatarUrl?: string;
  isGuest: boolean;
  joinedAt: number;
}

interface ActiveSession {
  sessionId: string;
  user1: QueueEntry;
  user2: QueueEntry;
  mode: 'TEXT' | 'VIDEO';
  createdAt: number;
  reveals: Set<string>; // userIds who agreed to reveal
}

const FUN_ANON_NAMES = [
  'Phantom Fox',
  'Neon Panda',
  'Cyber Wolf',
  'Cosmic Owl',
  'Silent Tiger',
  'Astral Otter',
  'Velvet Lynx',
  'Shadow Falcon',
  'Solar Chameleon',
  'Quantum Raven',
  'Pixel Koala',
  'Turbo Badger',
];

const FUN_ANON_AVATARS = [
  'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
];

@Injectable()
export class AnonymousConnectService {
  private readonly logger = new Logger(AnonymousConnectService.name);

  // Queue of waiting users
  private queue: QueueEntry[] = [];

  // Active sessions: sessionId -> ActiveSession
  private sessions = new Map<string, ActiveSession>();

  // Map socketId -> sessionId
  private socketToSession = new Map<string, string>();

  // Rate limiting for guest messages: socketId -> lastMessageTimestamp
  private guestMessageCooldowns = new Map<string, number>();

  // Private Jam rooms: roomCode -> QueueEntry
  private privateRooms = new Map<string, QueueEntry>();

  /**
   * Generates a fun anonymous pseudonym
   */
  generatePseudonym(isGuest: boolean): { pseudonym: string; avatarUrl: string } {
    const randomName = FUN_ANON_NAMES[Math.floor(Math.random() * FUN_ANON_NAMES.length)];
    const randomAvatar = FUN_ANON_AVATARS[Math.floor(Math.random() * FUN_ANON_AVATARS.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return {
      pseudonym: isGuest ? `Guest ${randomName} #${num}` : `Anon ${randomName} #${num}`,
      avatarUrl: randomAvatar,
    };
  }

  /**
   * Safe helper to resolve a socket instance from the server namespace
   */
  private getSocket(server: any, socketId: string): Socket | undefined {
    if (!server || !socketId) return undefined;
    if (server.sockets instanceof Map) {
      return server.sockets.get(socketId);
    }
    if (server.sockets?.sockets instanceof Map) {
      return server.sockets.sockets.get(socketId);
    }
    if (typeof server.sockets?.get === 'function') {
      return server.sockets.get(socketId);
    }
    if (typeof server.of === 'function') {
      const rootNs = server.of('/');
      if (rootNs?.sockets instanceof Map) {
        return rootNs.sockets.get(socketId);
      }
      if (typeof rootNs?.sockets?.get === 'function') {
        return rootNs.sockets.get(socketId);
      }
    }
    return undefined;
  }

  /**
   * Adds a user to the anonymous matchmaking queue or matches private room code
   */
  joinQueue(server: Server, client: Socket, payload: AnonQueueJoinPayload) {
    const user = client.data?.user;
    this.logger.log(`joinQueue: client=${client.id}, roomCode=${payload.roomCode}, hasUser=${Boolean(user)}`);
    if (!user) return;

    // Leave any existing session or queue first
    this.leaveSessionOrQueue(server, client);

    const generated = this.generatePseudonym(Boolean(user.isGuest));
    const entry: QueueEntry = {
      socketId: client.id,
      userId: user.sub,
      mode: payload.mode || 'TEXT',
      interests: (payload.interests || []).map((i) => i.trim().toLowerCase()).filter(Boolean),
      pseudonym: payload.pseudonym || generated.pseudonym,
      avatarUrl: generated.avatarUrl,
      isGuest: Boolean(user.isGuest),
      joinedAt: Date.now(),
    };

    // Private Jam Room Matching by Room Code
    const roomCode = payload.roomCode?.trim().toUpperCase();
    if (roomCode) {
      const existing = this.privateRooms.get(roomCode);
      this.logger.log(`privateRooms lookup for ${roomCode}: existing=${existing ? existing.socketId : 'none'}, current=${client.id}`);
      if (existing && existing.socketId !== client.id) {
        const existingSocket = this.getSocket(server, existing.socketId);
        if (existingSocket && !existingSocket.connected) {
          this.logger.warn(`Private room ${roomCode} host socket ${existing.socketId} disconnected. Replacing with new client ${client.id}.`);
          this.privateRooms.set(roomCode, entry);
          client.emit(REALTIME_EVENTS.ANON_QUEUE_STATUS, {
            inQueue: true,
            roomCode,
            message: `Private Jam room created! Waiting for Player 2 to join with code: ${roomCode}`,
          });
          return;
        }

        this.logger.log(`Matching private Jam room ${roomCode} between ${existing.pseudonym} (Host: ${existing.socketId}) and ${entry.pseudonym} (Player 2: ${client.id})`);
        this.privateRooms.delete(roomCode);
        this.createSession(server, existing, entry);
        return;
      } else {
        this.logger.log(`Client ${client.id} (${entry.pseudonym}) registered waiting in private room ${roomCode}`);
        this.privateRooms.set(roomCode, entry);
        client.emit(REALTIME_EVENTS.ANON_QUEUE_STATUS, {
          inQueue: true,
          roomCode,
          message: `Private Jam room created! Waiting for Player 2 to join with code: ${roomCode}`,
        });
        return;
      }
    }

    // Standard matchmaking queue
    const matchIndex = this.findMatchIndex(entry);

    if (matchIndex !== -1) {
      const partner = this.queue.splice(matchIndex, 1)[0];
      this.createSession(server, entry, partner);
    } else {
      this.queue.push(entry);
      this.broadcastQueueStatus(server);
      client.emit(REALTIME_EVENTS.ANON_QUEUE_STATUS, {
        inQueue: true,
        queueLength: this.queue.length,
        message: 'Looking for an anonymous partner...',
      });
    }
  }

  /**
   * Removes client from queue or active session
   */
  leaveSessionOrQueue(server: Server, client: Socket) {
    // 0. Remove from private rooms if present
    for (const [code, rEntry] of this.privateRooms.entries()) {
      if (rEntry.socketId === client.id) {
        this.privateRooms.delete(code);
      }
    }

    // 1. Remove from queue if present
    const qIdx = this.queue.findIndex((e) => e.socketId === client.id);
    if (qIdx !== -1) {
      this.queue.splice(qIdx, 1);
      this.broadcastQueueStatus(server);
      client.emit(REALTIME_EVENTS.ANON_QUEUE_STATUS, { inQueue: false });
    }

    // 2. Terminate active session if present
    const sessionId = this.socketToSession.get(client.id);
    if (sessionId) {
      this.endSession(server, sessionId, client.id);
    }
  }

  /**
   * Advances to next match: ends current session and immediately re-queues
   */
  nextMatch(server: Server, client: Socket, payload: AnonQueueJoinPayload) {
    this.leaveSessionOrQueue(server, client);
    this.joinQueue(server, client, payload);
  }

  /**
   * Handles incoming anonymous text message
   */
  sendMessage(server: Server, client: Socket, payload: AnonMessagePayload) {
    const user = client.data?.user;
    if (!user || !payload?.sessionId || !payload?.content?.trim()) return;

    const session = this.sessions.get(payload.sessionId);
    if (!session) return;

    // Enforce message rate limit for Guest users (3 second cooldown)
    if (user.isGuest) {
      const now = Date.now();
      const last = this.guestMessageCooldowns.get(client.id) || 0;
      if (now - last < 3000) {
        client.emit('error', {
          code: 'RATE_LIMITED',
          message: 'Guest accounts have a 3-second message cooldown. Please slow down.',
        });
        return;
      }
      this.guestMessageCooldowns.set(client.id, now);
    }

    const senderEntry = session.user1.socketId === client.id ? session.user1 : session.user2;
    const broadcast: AnonMessageBroadcast = {
      sessionId: session.sessionId,
      senderId: user.sub,
      senderPseudonym: senderEntry.pseudonym,
      content: payload.content.trim(),
      timestamp: new Date().toISOString(),
    };

    server.to(`anon:${session.sessionId}`).emit(REALTIME_EVENTS.ANON_MESSAGE_RECEIVED, broadcast);
  }

  /**
   * Relays typing event
   */
  handleTyping(server: Server, client: Socket, data: { sessionId: string; isTyping: boolean }) {
    const session = this.sessions.get(data.sessionId);
    if (!session) return;

    const sender = session.user1.socketId === client.id ? session.user1 : session.user2;
    client.to(`anon:${data.sessionId}`).emit(REALTIME_EVENTS.ANON_TYPING, {
      sessionId: data.sessionId,
      senderPseudonym: sender.pseudonym,
      isTyping: data.isTyping,
    });
  }

  /**
   * WebRTC signaling for anonymous video/voice calls
   */
  handleMediaSignal(server: Server, client: Socket, data: { sessionId: string; signal: any }) {
    const session = this.sessions.get(data.sessionId);
    if (!session) return;

    client.to(`anon:${data.sessionId}`).emit(REALTIME_EVENTS.ANON_MEDIA_SIGNAL, {
      sessionId: data.sessionId,
      signal: data.signal,
      fromSocketId: client.id,
    });
  }

  /**
   * Mutual reveal request: reveals real profiles if both users consent
   */
  handleRevealRequest(server: Server, client: Socket, data: { sessionId: string }) {
    const session = this.sessions.get(data.sessionId);
    const user = client.data?.user;
    if (!session || !user) return;

    session.reveals.add(user.sub);

    // If both partners have agreed to reveal:
    if (session.reveals.has(session.user1.userId) && session.reveals.has(session.user2.userId)) {
      server.to(`anon:${session.sessionId}`).emit(REALTIME_EVENTS.ANON_REVEAL_ACCEPTED, {
        sessionId: session.sessionId,
        user1: {
          id: session.user1.userId,
          pseudonym: session.user1.pseudonym,
          realUsername: session.user1.userId,
        },
        user2: {
          id: session.user2.userId,
          pseudonym: session.user2.pseudonym,
          realUsername: session.user2.userId,
        },
      });
    } else {
      // Notify other user of the reveal request
      client.to(`anon:${session.sessionId}`).emit(REALTIME_EVENTS.ANON_REVEAL_REQUEST, {
        sessionId: session.sessionId,
        requesterPseudonym:
          session.user1.socketId === client.id ? session.user1.pseudonym : session.user2.pseudonym,
      });
    }
  }

  /**
   * Co-Op Canvas & Trivia Jam: Relays realtime game actions and state between paired peers
   */
  handleGameAction(
    server: Server,
    client: Socket,
    data: { sessionId: string; game: string; action: string; payload: any }
  ) {
    if (!data?.sessionId) return;
    const session = this.sessions.get(data.sessionId);
    if (!session) return;

    // Relay to partner in the anon session room
    client.to(`anon:${data.sessionId}`).emit(REALTIME_EVENTS.ANON_GAME_ACTION, {
      sessionId: data.sessionId,
      senderSocketId: client.id,
      game: data.game,
      action: data.action,
      payload: data.payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Creates an active session pairing two users
   */
  private createSession(server: Server, user1: QueueEntry, user2: QueueEntry) {
    const sessionId = `anon_${randomUUID()}`;
    const session: ActiveSession = {
      sessionId,
      user1,
      user2,
      mode: user1.mode === 'VIDEO' || user2.mode === 'VIDEO' ? 'VIDEO' : 'TEXT',
      createdAt: Date.now(),
      reveals: new Set(),
    };

    this.sessions.set(sessionId, session);
    this.socketToSession.set(user1.socketId, sessionId);
    this.socketToSession.set(user2.socketId, sessionId);

    // Join sockets to session room
    const s1 = this.getSocket(server, user1.socketId);
    const s2 = this.getSocket(server, user2.socketId);

    if (s1) s1.join(`anon:${sessionId}`);
    if (s2) s2.join(`anon:${sessionId}`);

    // Try multi-process / Redis adapter room join
    if (typeof (server as any).in === 'function') {
      try {
        (server as any).in(user1.socketId).socketsJoin(`anon:${sessionId}`);
        (server as any).in(user2.socketId).socketsJoin(`anon:${sessionId}`);
      } catch {}
    }

    // Emit matched to User 1 (Host)
    const match1: AnonMatchedPayload = {
      sessionId,
      isHost: true,
      partner: {
        userId: user2.userId,
        pseudonym: user2.pseudonym,
        avatarUrl: user2.avatarUrl,
        isGuest: user2.isGuest,
        interests: user2.interests,
      },
      mode: session.mode,
    };
    if (s1) s1.emit(REALTIME_EVENTS.ANON_MATCHED, match1);
    server.to(user1.socketId).emit(REALTIME_EVENTS.ANON_MATCHED, match1);

    // Emit matched to User 2 (Guest / Player 2)
    const match2: AnonMatchedPayload = {
      sessionId,
      isHost: false,
      partner: {
        userId: user1.userId,
        pseudonym: user1.pseudonym,
        avatarUrl: user1.avatarUrl,
        isGuest: user1.isGuest,
        interests: user1.interests,
      },
      mode: session.mode,
    };
    if (s2) s2.emit(REALTIME_EVENTS.ANON_MATCHED, match2);
    server.to(user2.socketId).emit(REALTIME_EVENTS.ANON_MATCHED, match2);

    this.logger.log(`Session ${sessionId} successfully created between ${user1.socketId} and ${user2.socketId}`);
    this.broadcastQueueStatus(server);
  }

  /**
   * Terminates session and notifies partner
   */
  private endSession(server: Server, sessionId: string, initiatorSocketId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.delete(sessionId);
    this.socketToSession.delete(session.user1.socketId);
    this.socketToSession.delete(session.user2.socketId);

    const partnerSocketId =
      session.user1.socketId === initiatorSocketId
        ? session.user2.socketId
        : session.user1.socketId;

    server.to(`anon:${sessionId}`).emit(REALTIME_EVENTS.ANON_PARTNER_LEFT, {
      sessionId,
      message: 'Your partner has disconnected or skipped to the next match.',
    });

    const s1 = this.getSocket(server, session.user1.socketId);
    const s2 = this.getSocket(server, session.user2.socketId);
    if (s1) s1.leave(`anon:${sessionId}`);
    if (s2) s2.leave(`anon:${sessionId}`);
  }

  /**
   * Helper to find matching candidate in queue
   */
  private findMatchIndex(entry: QueueEntry): number {
    if (this.queue.length === 0) return -1;

    // 1. Try to find someone with matching mode and shared interests
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.queue[i];
      if (candidate.socketId === entry.socketId || candidate.userId === entry.userId) continue;

      if (candidate.mode === entry.mode) {
        const hasSharedInterest = candidate.interests.some((tag) => entry.interests.includes(tag));
        if (hasSharedInterest) return i;
      }
    }

    // 2. Try to match any user with matching mode
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.queue[i];
      if (candidate.socketId === entry.socketId || candidate.userId === entry.userId) continue;
      if (candidate.mode === entry.mode) return i;
    }

    // 3. Fallback: match any waiting user
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.queue[i];
      if (candidate.socketId !== entry.socketId && candidate.userId !== entry.userId) {
        return i;
      }
    }

    return -1;
  }

  private broadcastQueueStatus(server: Server) {
    server.emit(REALTIME_EVENTS.ANON_QUEUE_STATUS, {
      queueLength: this.queue.length,
      activeSessionsCount: this.sessions.size,
    });
  }
}
