import { UserSummaryDTO } from './user.js';

export interface QuotedMessageDTO {
  id: string;
  senderId: string;
  content: string;
  attachments?: Record<string, any>[] | null;
  createdAt: string;
  sender?: UserSummaryDTO;
}

export interface ThreadMetaDTO {
  replyCount: number;
  lastReplyAt: string | null;
  participantAvatars: (string | null)[];
  participantCount?: number;
}

export interface MessageDTO {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  attachments?: Record<string, any>[] | null;
  createdAt: string;
  updatedAt: string;
  sender?: UserSummaryDTO;

  // WhatsApp-style Quote Reply
  replyToId?: string | null;
  replyTo?: QuotedMessageDTO | null;

  // Slack-style Thread
  threadId?: string | null;
  isThreadBroadcast?: boolean;
  threadMeta?: ThreadMetaDTO | null;
}

export interface ThreadDetailsDTO {
  rootMessage: MessageDTO;
  replies: MessageDTO[];
}

