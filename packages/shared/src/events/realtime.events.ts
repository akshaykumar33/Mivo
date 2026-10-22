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

  // Active AI Stage Co-Host & Real-Time Duplex Agent
  ROOM_AI_AGENT_ACTION: 'room:ai_agent_action',
  ROOM_AI_AGENT_RESPONSE: 'room:ai_agent_response',
  ROOM_AI_FACT_CHECK: 'room:ai_fact_check',
  ROOM_AI_PIN_TILE: 'room:ai_pin_tile',
  ROOM_AI_DISMISS_TILE: 'room:ai_dismiss_tile',

  // Collaborative Whiteboard & Flowchart Stage (CANVAS Mode)
  ROOM_CANVAS_UPDATE: 'room:canvas_update',
  ROOM_CANVAS_CURSOR: 'room:canvas_cursor',
  ROOM_CANVAS_CLEAR: 'room:canvas_clear',
  ROOM_CANVAS_AI_GENERATE: 'room:canvas_ai_generate',

  // 3D Spatial Audio & Dynamic Physics Grid
  ROOM_SPATIAL_AUDIO_UPDATE: 'room:spatial_audio_update',

  // Spoken Voice-to-Ticket Automation
  ROOM_VOICE_TICKET_DETECTED: 'room:voice_ticket_detected',
  ROOM_VOICE_TICKET_CONFIRM: 'room:voice_ticket_confirm',

  // 1. Media Plane: SFU Engine Upgrade
  SFU_GET_ROUTER_RTP_CAPABILITIES: 'sfu:get_router_rtp_capabilities',
  SFU_CREATE_TRANSPORT: 'sfu:create_transport',
  SFU_CONNECT_TRANSPORT: 'sfu:connect_transport',
  SFU_PRODUCE: 'sfu:produce',
  SFU_CONSUME: 'sfu:consume',
  SFU_SET_PREFERRED_LAYERS: 'sfu:set_preferred_layers',
  SFU_STATS_UPDATE: 'sfu:stats_update',
  SFU_MODE_SWITCH: 'sfu:mode_switch',

  // 2. Media Plane: E2EE Zero-Trust Encryption
  E2EE_KEY_EXCHANGE: 'e2ee:key_exchange',
  E2EE_EPOCH_ROTATED: 'e2ee:epoch_rotated',
  E2EE_VERIFY_SAFETY_CODE: 'e2ee:verify_safety_code',

  // 3. Developer DX: CODE_STAGE Pair-Programming Sandbox
  CODE_STAGE_CHANGE: 'code_stage:change',
  CODE_STAGE_CURSOR: 'code_stage:cursor',
  CODE_STAGE_EXECUTE: 'code_stage:execute',
  CODE_STAGE_EXECUTION_RESULT: 'code_stage:execution_result',

  // 4. Presence: AI Twin & Out of Office Persona
  AI_TWIN_AUTO_REPLY: 'ai_twin:auto_reply',
  AI_TWIN_SCHEDULE_CALLBACK: 'ai_twin:schedule_callback',

  // 5. Vibe & Flow: Ambient Spatial Focus Rooms & Pomodoro
  FOCUS_TIMER_SYNC: 'focus:timer_sync',
  FOCUS_TIMER_ACTION: 'focus:timer_action',
  FOCUS_TRACK_CHANGE: 'focus:track_change',

  // 6. Extensibility: Mivo Mini-Apps / Activity Sandboxes
  ACTIVITY_LAUNCH: 'activity:launch',
  ACTIVITY_SYNC_STATE: 'activity:sync_state',
  ACTIVITY_ACTION: 'activity:action',
  ACTIVITY_CLOSE: 'activity:close',

  // 7. Offline-First: CRDT Sync & Local-First Messaging
  CRDT_SYNC_BATCH: 'crdt:sync_batch',
  CRDT_SYNC_ACK: 'crdt:sync_ack',
  CRDT_STATE_DELTA: 'crdt:state_delta',

  // 8. Anonymous & Guest Random Discovery & Speed Connect
  ANON_QUEUE_JOIN: 'anon:queue_join',
  ANON_QUEUE_LEAVE: 'anon:queue_leave',
  ANON_QUEUE_STATUS: 'anon:queue_status',
  ANON_MATCHED: 'anon:matched',
  ANON_NEXT: 'anon:next',
  ANON_END: 'anon:end',
  ANON_PARTNER_LEFT: 'anon:partner_left',
  ANON_SEND_MESSAGE: 'anon:send_message',
  ANON_MESSAGE_RECEIVED: 'anon:message_received',
  ANON_TYPING: 'anon:typing',
  ANON_REVEAL_REQUEST: 'anon:reveal_request',
  ANON_REVEAL_ACCEPTED: 'anon:reveal_accepted',
  ANON_MEDIA_SIGNAL: 'anon:media_signal',
  ANON_GAME_ACTION: 'anon:game_action',
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

export interface CanvasElement {
  id: string;
  type: 'STICKY' | 'SHAPE' | 'SERVICE' | 'DATABASE' | 'QUEUE' | 'GATEWAY' | 'CONNECTOR' | 'TEXT';
  x: number;
  y: number;
  width?: number;
  height?: number;
  title?: string;
  content?: string;
  color?: string;
  fromId?: string;
  toId?: string;
  label?: string;
  authorName?: string;
  authorId?: string;
}

export interface CanvasCursorPayload {
  roomId: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  x: number;
  y: number;
  color: string;
}

export interface CanvasUpdatePayload {
  roomId: string;
  elements: CanvasElement[];
  action: 'UPSERT' | 'DELETE' | 'CLEAR' | 'SYNC';
  updatedBy: string;
}

export interface SpatialAudioPayload {
  roomId: string;
  userId: string;
  x: number;
  y: number;
  pan: number; // -1.0 (Left) to +1.0 (Right)
  distance?: number;
}

export interface VoiceTicketDetectedPayload {
  roomId: string;
  ticketProposal: {
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    category?: string;
    suggestedAssignee?: string;
  };
  speakerName?: string;
}

export interface VoiceTicketConfirmPayload {
  roomId: string;
  ticketProposal: {
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    category?: string;
    suggestedAssignee?: string;
    communityId?: string;
  };
}

export interface AnonQueueJoinPayload {
  mode: 'TEXT' | 'VIDEO';
  interests?: string[];
  pseudonym?: string;
}

export interface AnonMatchedPayload {
  sessionId: string;
  roomId?: string;
  partner: {
    userId: string;
    pseudonym: string;
    avatarUrl?: string;
    isGuest: boolean;
    interests?: string[];
  };
  mode: 'TEXT' | 'VIDEO';
}

export interface AnonMessagePayload {
  sessionId: string;
  content: string;
}

export interface AnonMessageBroadcast {
  sessionId: string;
  senderId: string;
  senderPseudonym: string;
  content: string;
  timestamp: string;
}

export interface AnonRevealAcceptedBroadcast {
  sessionId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface AnonGameActionPayload {
  sessionId: string;
  game: string;
  action: string;
  payload: any;
}

export interface AnonGameActionBroadcast {
  sessionId: string;
  senderSocketId: string;
  game: string;
  action: string;
  payload: any;
  timestamp: number;
}
