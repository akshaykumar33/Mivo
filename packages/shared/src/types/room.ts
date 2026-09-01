import { UserSummaryDTO } from './user.js';

export type RoomCommunicationMode = 'TEXT' | 'VOICE' | 'VIDEO' | 'SCREEN_SHARE' | 'STREAM';

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
