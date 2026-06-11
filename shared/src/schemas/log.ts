import { z } from 'zod';
import { currencySchema, idSchema, isoDateString, logKindSchema } from './common.js';

export const logSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  content: z.string().max(8000).nullable(),
  kind: logKindSchema,
  areaId: idSchema.nullable(),
  trackId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  taskId: idSchema.nullable(),
  problemId: idSchema.nullable(),
  studyTopicId: idSchema.nullable(),
  timeSpentMinutes: z.number().int().nullable(),
  costAmount: z.number().nullable(),
  costCurrency: z.string().nullable(),
  costAmountEur: z.number().nullable(),
  occurredAt: isoDateString,
  createdAt: isoDateString,
});
export type Log = z.infer<typeof logSchema>;

/** Logs are create-only; there is no PATCH/update API by design. */
export const createLogInputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(8000).optional(),
  kind: logKindSchema,
  areaId: idSchema.optional().nullable(),
  trackId: idSchema.optional().nullable(),
  goalId: idSchema.optional().nullable(),
  taskId: idSchema.optional().nullable(),
  problemId: idSchema.optional().nullable(),
  studyTopicId: idSchema.optional().nullable(),
  timeSpentMinutes: z.number().int().min(0).max(60 * 24).optional(),
  costAmount: z.number().min(0).optional(),
  costCurrency: currencySchema.optional(),
  occurredAt: isoDateString.optional(),
});
export type CreateLogInput = z.infer<typeof createLogInputSchema>;
