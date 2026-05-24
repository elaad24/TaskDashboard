import { z } from 'zod';
import { idSchema, isoDateString, prioritySchema, problemStatusSchema } from './common.js';

export const problemSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable(),
  areaId: idSchema.nullable(),
  trackId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  status: problemStatusSchema,
  priority: prioritySchema,
  aiInterpretation: z.string().max(4000).nullable(),
  suggestedPlan: z.string().max(8000).nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  resolvedAt: isoDateString.nullable(),
});
export type Problem = z.infer<typeof problemSchema>;

export const createProblemInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  areaId: idSchema.optional().nullable(),
  trackId: idSchema.optional().nullable(),
  goalId: idSchema.optional().nullable(),
  status: problemStatusSchema.optional(),
  priority: prioritySchema.optional(),
  aiInterpretation: z.string().max(4000).optional(),
  suggestedPlan: z.string().max(8000).optional(),
});
export type CreateProblemInput = z.infer<typeof createProblemInputSchema>;

export const updateProblemInputSchema = createProblemInputSchema.partial();
export type UpdateProblemInput = z.infer<typeof updateProblemInputSchema>;
