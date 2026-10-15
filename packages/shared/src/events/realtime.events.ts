import { RoomCommunicationMode, RoomMemberDTO } from '../types/room.js';
import { UserStatus, UserSummaryDTO } from '../types/user.js';

export const REALTIME_EVENTS = {
  // Client to Server
  PRESENCE_HEARTBEAT: 'presence:heartbeat',
  PRESENCE_UPDATE: 'presence:update',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_CHANGE_MODE: 'room:change_mode',
  ROOM_UPDATE_MEDIA_STATE: 'room:update_media_state',

  // Server to Client / Broadcast
  CONNECTION_ACK: 'connection:ack',
  PRESENCE_USER_UPDATED: 'presence:user_updated',
  ROOM_JOINED: 'room:joined',
  ROOM_PARTICIPANT_JOINED: 'room:participant_joined',
  ROOM_PARTICIPANT_LEFT: 'room:participant_left',
  ROOM_MODE_CHANGED: 'room:mode_changed',
  ROOM_PARTICIPANT_STATE_UPDATED: 'room:participant_state_updated',

  // Host & Moderation Controls
  ROOM_HOST_ACTION: 'room:host_action',
  ROOM_HOST_TRANSFERRED: 'room:host_transferred',

  // Meeting Recording & Consent
  ROOM_RECORDING_START: 'room:recording_start',
  ROOM_RECORDING_STOP: 'room:recording_stop',
  ROOM_RECORDING_STATE_CHANGED: 'room:recording_state_changed',

  // Realtime Messaging
  CHAT_SEND_MESSAGE: 'chat:send_message',
  CHAT_NEW_MESSAGE: 'chat:new_message',
  CHAT_TYPING: 'chat:typing',
  CHAT_STOP_TYPING: 'chat:stop_typing',
  CHAT_REACTION_ADD: 'chat:reaction_add',
  CHAT_REACTION_ADDED: 'chat:reaction_added',

  // WebRTC Signaling
  SIGNALING_OFFER: 'signaling:offer',
  SIGNALING_ANSWER: 'signaling:answer',
  SIGNALING_ICE_CANDIDATE: 'signaling:ice_candidate',
} as const;

export interface ChatReactionPayload {
  roomId: string;
  messageId: string;
  emoji: string;
}

export interface ChatReactionAddedBroadcast {
  roomId: string;
  messageId: string;
  emoji: string;
  userId: string;
}

export interface RoomHostActionPayload {
  roomId: string;
  action: 'MUTE' | 'KICK' | 'TRANSFER_HOST';
  targetUserId: string;
  newHostUserId?: string;
  reason?: string;
}

export interface RoomRecordingStatePayload {
  roomId: string;
  isRecording: boolean;
  hostName: string;
  startedAt?: string;
}

export interface ChatTypingPayload {
  roomId: string;
  userId: string;
  username: string;
}

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export interface PresenceHeartbeatPayload {
  status: UserStatus;
  customStatus?: string | null;
}

export interface RoomJoinPayload {
  roomId: string;
}

export interface RoomLeavePayload {
  roomId: string;
}

export interface RoomChangeModePayload {
  roomId: string;
  activeMode: RoomCommunicationMode;
}

export interface RoomUpdateMediaStatePayload {
  roomId: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  isCameraOn?: boolean;
  isScreenOn?: boolean;
}

export interface RoomJoinedResponse {
  roomId: string;
  activeMode: RoomCommunicationMode;
  members: RoomMemberDTO[];
}

export interface RoomParticipantJoinedBroadcast {
  roomId: string;
  participant: RoomMemberDTO;
}

export interface RoomParticipantLeftBroadcast {
  roomId: string;
  userId: string;
  reason?: string;
}

export interface RoomModeChangedBroadcast {
  roomId: string;
  activeMode: RoomCommunicationMode;
  updatedBy: string;
}

export interface RoomParticipantStateUpdatedBroadcast {
  roomId: string;
  userId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenOn: boolean;
}
