import { z } from 'zod';
import { idSchema, isoDateString } from './common.js';

export const askFieldsSchema = z.object({
  cost: z.boolean().optional(),
  duration: z.boolean().optional(),
  location: z.boolean().optional(),
  counterparty: z.boolean().optional(),
});
export type AskFields = z.infer<typeof askFieldsSchema>;

export const trackedTagSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(120),
  aliases: z.array(z.string().min(1).max(120)),
  areaId: idSchema.nullable(),
  askFields: askFieldsSchema,
  defaultLogKind: z.enum(['expense', 'study', 'note']),
  autoLog: z.boolean(),
  active: z.boolean(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type TrackedTag = z.infer<typeof trackedTagSchema>;

export const createTrackedTagInputSchema = z.object({
  name: z.string().min(1).max(120),
  aliases: z.array(z.string().min(1).max(120)).optional(),
  areaId: idSchema.optional().nullable(),
  askFields: askFieldsSchema.optional(),
  defaultLogKind: z.enum(['expense', 'study', 'note']).optional(),
  autoLog: z.boolean().optional(),
  active: z.boolean().optional(),
});
export type CreateTrackedTagInput = z.infer<typeof createTrackedTagInputSchema>;

export const updateTrackedTagInputSchema = createTrackedTagInputSchema.partial();
export type UpdateTrackedTagInput = z.infer<typeof updateTrackedTagInputSchema>;
