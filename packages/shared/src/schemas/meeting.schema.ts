import { z } from 'zod';

export const CreateExternalMeetingSchema = z.object({
  provider: z.enum(['GOOGLE_MEET', 'MS_TEAMS']),
  title: z.string().min(1, 'Meeting title is required').max(100, 'Meeting title cannot exceed 100 characters'),
  roomId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  shareToChat: z.boolean().optional().default(true),
  bridgeToRoom: z.boolean().optional().default(false),
  bridgeToConversation: z.boolean().optional().default(false),
  scheduledFor: z.string().optional(),
});

export type CreateExternalMeetingInput = z.infer<typeof CreateExternalMeetingSchema>;

export const SetRoomBridgeSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required'),
});

export type SetRoomBridgeInput = z.infer<typeof SetRoomBridgeSchema>;

export const SetConversationBridgeSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required'),
});

export type SetConversationBridgeInput = z.infer<typeof SetConversationBridgeSchema>;

export const UpdateMeetingConfigSchema = z.object({
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  teamsTenantId: z.string().optional(),
  teamsClientId: z.string().optional(),
  teamsClientSecret: z.string().optional(),
});

export type UpdateMeetingConfigInput = z.infer<typeof UpdateMeetingConfigSchema>;
