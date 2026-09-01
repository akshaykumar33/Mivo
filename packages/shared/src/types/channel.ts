import { RoomSummaryDTO } from './room.js';

export type ChannelType = 'TEXT' | 'VOICE' | 'MEDIA' | 'GENERAL';

export interface ChannelDTO {
  id: string;
  communityId: string;
  name: string;
  topic: string | null;
  type: ChannelType;
  position: number;
  isPrivate: boolean;
  rooms?: RoomSummaryDTO[];
  createdAt: string;
}
