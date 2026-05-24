import { z } from 'zod';
import { idSchema, isoDateString } from './common.js';

export const recurrenceFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'interval']);

export const recurrenceSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  frequency: recurrenceFrequencySchema,
  intervalDays: z.number().int().min(1).nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable(),
  monthDay: z.number().int().min(1).max(31).nullable(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  startsOn: isoDateString,
  endsOn: isoDateString.nullable(),
  lastMaterializedAt: isoDateString.nullable(),
  isActive: z.boolean(),
  autoCreateCalendarEvent: z.boolean(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type TaskRecurrence = z.infer<typeof recurrenceSchema>;

export const createRecurrenceInputSchema = z.object({
  frequency: recurrenceFrequencySchema,
  intervalDays: z.number().int().min(1).optional().nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  monthDay: z.number().int().min(1).max(31).optional().nullable(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1).default('UTC'),
  startsOn: isoDateString,
  endsOn: isoDateString.optional().nullable(),
  isActive: z.boolean().optional(),
  autoCreateCalendarEvent: z.boolean().optional(),
});
export type CreateRecurrenceInput = z.infer<typeof createRecurrenceInputSchema>;

export const updateRecurrenceInputSchema = createRecurrenceInputSchema.partial();
export type UpdateRecurrenceInput = z.infer<typeof updateRecurrenceInputSchema>;
