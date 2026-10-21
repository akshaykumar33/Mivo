/**
 * 🌌 Mivo Hyper Features — Shared Types & Enums
 * Architectural abstractions for SFU, E2EE, Code Stage, AI Twin,
 * Ambient Focus, Mini-Apps Activities, and Local-First CRDT Sync.
 */

// ============================================================================
// 1. MEDIA PLANE: SFU ENGINE (Mediasoup / LiveKit Architecture)
// ============================================================================

export type SfuSimulcastLayer = '1080p' | '720p' | '360p';

export interface SfuRtpCapabilities {
  codecs: Array<{
    mimeType: string;
    clockRate: number;
    channels?: number;
    parameters?: Record<string, any>;
  }>;
  headerExtensions: Array<{
    uri: string;
    id: number;
  }>;
}

export interface SfuTransportOptions {
  id: string;
  iceParameters: {
    usernameFragment: string;
    password: string;
  };
  iceCandidates: Array<{
    foundation: string;
    ip: string;
    port: number;
    priority: number;
    protocol: 'udp' | 'tcp';
    type: 'host' | 'srflx' | 'relay';
  }>;
  dtlsParameters: {
    role: 'auto' | 'client' | 'server';
    fingerprints: Array<{
      algorithm: string;
      value: string;
    }>;
  };
}

export interface SfuProducerDTO {
  id: string;
  kind: 'audio' | 'video';
  userId: string;
  roomId: string;
  simulcast: boolean;
  activeLayer: SfuSimulcastLayer;
  bitrateKbps: number;
  paused: boolean;
}

export interface SfuConsumerDTO {
  id: string;
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
  currentSpatialLayer: number; // 0 = 360p, 1 = 720p, 2 = 1080p
  currentTemporalLayer: number;
  score: number; // 0 - 10
}

export interface SfuRoomStatsDTO {
  roomId: string;
  engine: 'SFU_ROUTER' | 'P2P_MESH';
  participantCount: number;
  activeProducers: number;
  activeConsumers: number;
  totalIngressBandwidthKbps: number;
  totalEgressBandwidthKbps: number;
  clientCpuReductionPercent: number; // e.g. 84% reduction vs mesh
}

// ============================================================================
// 2. MEDIA PLANE: END-TO-END ENCRYPTION (E2EE)
// ============================================================================

export interface E2eeEpochKeyPackage {
  roomId: string;
  epoch: number;
  keyId: string;
  encryptedKey: string; // Base64 ciphertext
  iv: string;
  senderUserId: string;
  timestamp: string;
}

export interface E2eeSafetyCodeVerification {
  roomId: string;
  epoch: number;
  fingerprintHex: string; // e.g. "9824 5510 3982 7714"
  verificationEmojis: [string, string, string, string]; // e.g. ["🛡️", "⚡", "🔑", "🚀"]
  participantsVerified: number;
}

// ============================================================================
// 3. DEVELOPER DX: CODE_STAGE PAIR-PROGRAMMING SANDBOX
// ============================================================================

export type SupportedCodeLanguage = 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'html' | 'json';

export interface CodeStageFile {
  id: string;
  name: string;
  language: SupportedCodeLanguage;
  content: string;
}

export interface CollaborativeCursor {
  userId: string;
  userName: string;
  color: string;
  lineNumber: number;
  column: number;
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

export interface SandboxExecutionRequest {
  language: SupportedCodeLanguage;
  code: string;
  stdin?: string;
  timeoutMs?: number;
}

export interface SandboxExecutionResponse {
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  memoryUsageMb: number;
}

// ============================================================================
// 4. PRESENCE: AI TWIN / "OUT OF OFFICE" PERSONA
// ============================================================================

export interface AiTwinConfigDTO {
  userId: string;
  enabled: boolean;
  personaPrompt: string;
  autoReplyDnd: boolean;
  autoReplyOffline: boolean;
  autoCallbackEnabled: boolean;
  callbackSlots: string[]; // e.g. ["Tomorrow 10:00 AM - 10:30 AM", "Tomorrow 2:00 PM - 2:30 PM"]
  indexedContextSummary?: string;
}

export interface AiTwinAutoReplyResult {
  replied: boolean;
  recipientUserId: string;
  senderName: string;
  replyContent: string;
  proposedCallbackSlot?: string;
  isAiTwin: true;
}

// ============================================================================
// 5. VIBE & FLOW: AMBIENT SPATIAL FOCUS ROOMS
// ============================================================================

export type AmbientTrackType = 'lofi_beats' | 'rain_storm' | 'coffee_shop' | 'cyber_synthwave';

export type PomodoroState = 'IDLE' | 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

export interface PomodoroTimerState {
  roomId: string;
  state: PomodoroState;
  remainingSeconds: number;
  totalDurationSeconds: number;
  isRunning: boolean;
  startedAt: string | null;
  currentTrack: AmbientTrackType;
  ambientVolume: number; // 0.0 - 1.0
  spatialImmersion: number; // 0.0 - 1.0
  focusedParticipantIds: string[];
}

// ============================================================================
// 6. EXTENSIBILITY: MIVO MINI-APPS / ACTIVITY SANDBOXES
// ============================================================================

export type MiniAppType = 'CHESS' | 'FIGMA_EMBED' | 'GITHUB_PR' | 'CUSTOM_URL';

export interface MiniAppManifest {
  id: string;
  type: MiniAppType;
  title: string;
  description: string;
  icon: string;
  initialUrl?: string;
  sandboxFlags: string;
}

export interface ActivityStateBroadcast {
  roomId: string;
  activityId: string;
  type: MiniAppType;
  startedByUserId: string;
  state: any; // Game state, PR state, embed zoom/pan
  participants: string[];
}

// ============================================================================
// 7. OFFLINE-FIRST: CRDT SYNC & LOCAL-FIRST MESSAGING
// ============================================================================

export type CrdtSyncStatus = 'SYNCING' | 'SYNCED' | 'OFFLINE_PENDING' | 'FAILED';

export interface CrdtMessageMutation {
  id: string;
  channelId?: string;
  roomId?: string;
  conversationId?: string;
  senderId: string;
  content: string;
  lamportClock: number;
  clientTimestamp: number;
  idempotencyKey: string;
  action: 'CREATE' | 'EDIT' | 'DELETE' | 'REACT';
  reactionEmoji?: string;
  attachments?: any[];
}

export interface CrdtSyncBatchPayload {
  clientId: string;
  mutations: CrdtMessageMutation[];
  stateVector: Record<string, number>; // peerId -> maxLamportClock
}

export interface CrdtSyncBatchResponse {
  acknowledgedIds: string[];
  serverClock: number;
  conflictsResolved: number;
  latestDeltas: CrdtMessageMutation[];
}
