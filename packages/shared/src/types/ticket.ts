import { UserSummaryDTO } from './user.js';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketDTO {
  id: string;
  communityId: string | null;
  creatorId: string;
  assigneeId: string | null;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  creator?: UserSummaryDTO;
  assignee?: UserSummaryDTO | null;
}
