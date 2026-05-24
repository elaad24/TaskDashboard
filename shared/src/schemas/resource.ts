import { z } from 'zod';
import { idSchema, isoDateString } from './common.js';

export const resourceSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  url: z.string().url().nullable(),
  type: z.enum(['link', 'note', 'file']),
  content: z.string().max(20000).nullable(),
  areaId: idSchema.nullable(),
  trackId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  studyTopicId: idSchema.nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type Resource = z.infer<typeof resourceSchema>;

export const createResourceInputSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().optional().nullable(),
  type: z.enum(['link', 'note', 'file']).optional(),
  content: z.string().max(20000).optional(),
  areaId: idSchema.optional().nullable(),
  trackId: idSchema.optional().nullable(),
  goalId: idSchema.optional().nullable(),
  studyTopicId: idSchema.optional().nullable(),
});
export type CreateResourceInput = z.infer<typeof createResourceInputSchema>;

export const updateResourceInputSchema = createResourceInputSchema.partial();
export type UpdateResourceInput = z.infer<typeof updateResourceInputSchema>;
