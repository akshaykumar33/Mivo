import { z } from 'zod';

export const CreateTicketSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(128),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.string().max(64).default('Support'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  communityId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const UpdateTicketSchema = z.object({
  title: z.string().min(3).max(128).optional(),
  description: z.string().min(5).optional(),
  category: z.string().max(64).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
