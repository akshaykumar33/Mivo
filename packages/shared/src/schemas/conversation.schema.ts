import { z } from 'zod';

export const CreateDirectConversationSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID'),
});

export const CreateGroupConversationSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(64, 'Group name cannot exceed 64 characters'),
  memberIds: z.array(z.string().uuid()).min(1, 'Please select at least 1 member for the group'),
  iconUrl: z.string().url().optional().or(z.literal('')),
});

export const SendDirectMessageSchema = z.object({
  content: z.string().max(4000).optional().default(''),
  attachments: z.array(z.any()).optional(),
}).refine((data) => (data.content && data.content.trim().length > 0) || (data.attachments && data.attachments.length > 0), {
  message: 'Message content or attachments required',
});

export type CreateDirectConversationInput = z.infer<typeof CreateDirectConversationSchema>;
export type CreateGroupConversationInput = z.infer<typeof CreateGroupConversationSchema>;
export type SendDirectMessageInput = z.infer<typeof SendDirectMessageSchema>;
