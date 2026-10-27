import { UserSummaryDTO } from './user.js';

export type RoomCommunicationMode = 'TEXT' | 'VOICE' | 'VIDEO' | 'SCREEN_SHARE' | 'STREAM' | 'CANVAS' | 'CODE';

export interface RoomDTO {
  id: string;
  channelId: string;
  name: string;
  description: string | null;
  activeMode: RoomCommunicationMode;
  maxCapacity: number;
  isLocked: boolean;
  activeMembers?: RoomMemberDTO[];
  createdAt: string;
}

export interface RoomSummaryDTO {
  id: string;
  channelId: string;
  name: string;
  activeMode: RoomCommunicationMode;
  isLocked: boolean;
  participantCount?: number;
}

export interface RoomMemberDTO {
  id: string;
  roomId: string;
  userId: string;
  user: UserSummaryDTO;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenOn: boolean;
  joinedAt: string;
}

export type AudioBitrateProfile = 'low-bandwidth' | 'standard' | 'hd' | 'studio' | 'adaptive';

export interface AudioBitrateConfig {
  profile: AudioBitrateProfile;
  currentBitrateKbps: number;
  minBitrateKbps: number;
  maxBitrateKbps: number;
  isLowBandwidthOptimized: boolean;
  usedtx: boolean;
  useinbandfec: boolean;
  stereo: boolean;
}

export const AUDIO_BITRATE_CONSTANTS = {
  MIN_KBPS: 16,
  STANDARD_KBPS: 32,
  HD_KBPS: 64,
  MAX_KBPS: 128,
  DEFAULT_KBPS: 32,
} as const;
