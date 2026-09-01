import { z } from 'zod';

export const SendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message cannot exceed 4000 characters'),
  attachments: z.array(z.record(z.any())).optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
