import { UserSummaryDTO } from './user.js';

export interface MessageDTO {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  attachments?: Record<string, any>[] | null;
  createdAt: string;
  updatedAt: string;
  sender?: UserSummaryDTO;
}
