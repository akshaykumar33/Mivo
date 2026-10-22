import { RoomSummaryDTO } from './room.js';

export interface ChannelDTO {
  id: string;
  communityId: string;
  name: string;
  topic: string | null;
  position: number;
  isPrivate: boolean;
  rooms?: RoomSummaryDTO[];
  createdAt: string;
}
