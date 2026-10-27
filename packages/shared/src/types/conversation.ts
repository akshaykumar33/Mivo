import { UserSummaryDTO } from './user.js';
import { AttachmentMetaDTO } from '../schemas/storage.schema.js';

export type ConversationType = 'DIRECT' | 'GROUP';

export interface ConversationMemberDTO {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string | null;
  user: UserSummaryDTO;
}

import { ThreadMetaDTO } from './message.js';

export interface QuotedDirectMessageDTO {
  id: string;
  senderId: string;
  content: string;
  attachments?: AttachmentMetaDTO[] | null;
  createdAt: string;
  sender: UserSummaryDTO;
}

export interface DirectMessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: AttachmentMetaDTO[] | null;
  createdAt: string;
  updatedAt: string;
  sender: UserSummaryDTO;

  // WhatsApp-style Quote Reply
  replyToId?: string | null;
  replyTo?: QuotedDirectMessageDTO | null;

  // Slack-style Thread
  threadId?: string | null;
  isThreadBroadcast?: boolean;
  threadMeta?: ThreadMetaDTO | null;
}

export interface DirectThreadDetailsDTO {
  rootMessage: DirectMessageDTO;
  replies: DirectMessageDTO[];
}

export interface ConversationDTO {
  id: string;
  type: ConversationType;
  name: string | null;
  iconUrl: string | null;
  createdById: string | null;
  members: ConversationMemberDTO[];
  lastMessage?: DirectMessageDTO | null;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CallSessionDTO {
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  isGroup: boolean;
  participants: string[];
  startedAt?: string;
}
