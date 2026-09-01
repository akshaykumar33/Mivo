import { z } from 'zod';

export const CreateChannelSchema = z.object({
  name: z
    .string()
    .min(2, 'Channel name must be at least 2 characters')
    .max(64, 'Channel name cannot exceed 64 characters')
    .regex(/^[a-z0-9-]+$/, 'Channel name must be lowercase alphanumeric with hyphens'),
  topic: z.string().max(255).optional(),
  type: z.enum(['TEXT', 'VOICE', 'MEDIA', 'GENERAL']).default('GENERAL'),
  isPrivate: z.boolean().default(false),
  position: z.number().int().nonnegative().optional(),
});

export const UpdateChannelSchema = CreateChannelSchema.partial();

export type CreateChannelInput = z.infer<typeof CreateChannelSchema>;
export type UpdateChannelInput = z.infer<typeof UpdateChannelSchema>;
