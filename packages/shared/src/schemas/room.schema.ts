import { z } from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().min(2, 'Room name must be at least 2 characters').max(64, 'Room name cannot exceed 64 characters'),
  description: z.string().max(255).optional(),
  activeMode: z.enum(['TEXT', 'VOICE', 'VIDEO', 'SCREEN_SHARE', 'STREAM']).default('TEXT'),
  maxCapacity: z.number().int().min(2).max(500).default(100),
  isLocked: z.boolean().default(false),
});

export const UpdateRoomSchema = CreateRoomSchema.partial();

export const ChangeRoomModeSchema = z.object({
  activeMode: z.enum(['TEXT', 'VOICE', 'VIDEO', 'SCREEN_SHARE', 'STREAM']),
});

export const UpdateRoomParticipantStateSchema = z.object({
  isMuted: z.boolean().optional(),
  isDeafened: z.boolean().optional(),
  isCameraOn: z.boolean().optional(),
  isScreenOn: z.boolean().optional(),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
export type ChangeRoomModeInput = z.infer<typeof ChangeRoomModeSchema>;
export type UpdateRoomParticipantStateInput = z.infer<typeof UpdateRoomParticipantStateSchema>;
