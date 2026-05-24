import { z } from 'zod';
import { goalStatusSchema, idSchema, isoDateString, prioritySchema } from './common.js';

export const goalSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable(),
  areaId: idSchema.nullable(),
  trackId: idSchema.nullable(),
  status: goalStatusSchema,
  priority: prioritySchema,
  sortOrder: z.number().int().min(0),
  progress: z.number().min(0).max(100),
  targetDate: isoDateString.nullable(),
  nextAction: z.string().max(400).nullable(),
  notes: z.string().max(8000).nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  completedAt: isoDateString.nullable(),
});
export type Goal = z.infer<typeof goalSchema>;

export const createGoalInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  areaId: idSchema.optional().nullable(),
  trackId: idSchema.optional().nullable(),
  status: goalStatusSchema.optional(),
  priority: prioritySchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  targetDate: isoDateString.optional().nullable(),
  nextAction: z.string().max(400).optional(),
  notes: z.string().max(8000).optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;

export const updateGoalInputSchema = createGoalInputSchema.partial();
export type UpdateGoalInput = z.infer<typeof updateGoalInputSchema>;
