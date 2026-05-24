import { z } from 'zod';
import { idSchema, isoDateString } from './common.js';

export const reminderKindSchema = z.enum([
  'one_off',
  'task_due',
  'recurring',
  'daily_digest',
  'custom',
]);
export const reminderStatusSchema = z.enum(['pending', 'sent', 'failed', 'cancelled', 'snoozed']);
export const reminderTargetTypeSchema = z.enum(['task', 'goal', 'problem']);

export const reminderSchema = z.object({
  id: idSchema,
  kind: reminderKindSchema,
  targetType: reminderTargetTypeSchema.nullable(),
  targetId: idSchema.nullable(),
  taskId: idSchema.nullable(),
  title: z.string().min(1).max(300),
  body: z.string().max(5000).nullable(),
  scheduledFor: isoDateString,
  timezone: z.string().min(1),
  status: reminderStatusSchema,
  sentAt: isoDateString.nullable(),
  snoozedUntil: isoDateString.nullable(),
  attempt: z.number().int().min(0),
  lastError: z.string().nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type Reminder = z.infer<typeof reminderSchema>;

export const createReminderInputSchema = z.object({
  kind: reminderKindSchema,
  targetType: reminderTargetTypeSchema.optional().nullable(),
  targetId: idSchema.optional().nullable(),
  taskId: idSchema.optional().nullable(),
  title: z.string().min(1).max(300),
  body: z.string().max(5000).optional().nullable(),
  scheduledFor: isoDateString,
  timezone: z.string().min(1).default('UTC'),
  status: reminderStatusSchema.optional(),
});
export type CreateReminderInput = z.infer<typeof createReminderInputSchema>;
