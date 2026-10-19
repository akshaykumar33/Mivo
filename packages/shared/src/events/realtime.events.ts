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

  // Direct & Group Messaging
  DM_JOIN: 'dm:join',
  DM_LEAVE: 'dm:leave',
  DM_SEND_MESSAGE: 'dm:send_message',
  DM_NEW_MESSAGE: 'dm:new_message',
  DM_TYPING: 'dm:typing',
  DM_STOP_TYPING: 'dm:stop_typing',
  DM_REACTION_ADD: 'dm:reaction_add',
  DM_REACTION_ADDED: 'dm:reaction_added',

  // Audio Calling (Direct & Group)
  CALL_INVITE: 'call:invite',
  CALL_INCOMING: 'call:incoming',
  CALL_ACCEPT: 'call:accept',
  CALL_ACCEPTED: 'call:accepted',
  CALL_DECLINE: 'call:decline',
  CALL_DECLINED: 'call:declined',
  CALL_END: 'call:end',
  CALL_ENDED: 'call:ended',
  CALL_PARTICIPANT_JOINED: 'call:participant_joined',
  CALL_PARTICIPANT_LEFT: 'call:participant_left',

  // External Meetings & Bridges
  MEETING_BRIDGE_ACTIVATED: 'meeting:bridge_activated',
  MEETING_BRIDGE_REMOVED: 'meeting:bridge_removed',
  DM_MEETING_BRIDGE_ACTIVATED: 'dm:meeting_bridge_activated',
  DM_MEETING_BRIDGE_REMOVED: 'dm:meeting_bridge_removed',

  // WebRTC Signaling
  SIGNALING_OFFER: 'signaling:offer',
  SIGNALING_ANSWER: 'signaling:answer',
  SIGNALING_ICE_CANDIDATE: 'signaling:ice_candidate',

  // Notifications & Alerts
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_READ_ALL: 'notification:read_all',

  // Ticketing System
  TICKET_CREATED: 'ticket:created',
  TICKET_UPDATED: 'ticket:updated',
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

export interface DmJoinPayload {
  conversationId: string;
}

export interface DmLeavePayload {
  conversationId: string;
}

export interface DmTypingPayload {
  conversationId: string;
  userId: string;
  username: string;
}

export interface DmReactionPayload {
  conversationId: string;
  messageId: string;
  emoji: string;
}

export interface DmReactionAddedBroadcast {
  conversationId: string;
  messageId: string;
  emoji: string;
  userId: string;
}

export interface CallInvitePayload {
  conversationId: string;
  recipientId?: string;
}

export interface CallIncomingBroadcast {
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  isGroup: boolean;
  groupName?: string | null;
}

export interface CallActionPayload {
  conversationId: string;
}

export interface CallEndedBroadcast {
  conversationId: string;
  reason?: string;
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
  customStatusExpiresAt?: string | null;
}

export interface PresenceUpdatePayload {
  status: UserStatus;
  customStatus?: string | null;
  customStatusExpiresAt?: string | null;
}

export interface PresenceUserUpdatedBroadcast {
  userId: string;
  status: UserStatus;
  customStatus?: string | null;
  customStatusExpiresAt?: string | null;
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

export interface MeetingBridgeActivatedBroadcast {
  roomId?: string;
  conversationId?: string;
  meeting: import('../types/meeting.js').ExternalMeetingDTO;
  activatedBy: import('../types/user.js').UserSummaryDTO;
  activatedAt: string;
}

export interface MeetingBridgeRemovedBroadcast {
  roomId?: string;
  conversationId?: string;
  removedBy: import('../types/user.js').UserSummaryDTO;
  removedAt: string;
}
