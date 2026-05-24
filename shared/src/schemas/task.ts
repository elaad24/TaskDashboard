import { z } from 'zod';
import {
  currencySchema,
  idSchema,
  isoDateString,
  prioritySchema,
  taskSourceSchema,
  taskStatusSchema,
} from './common.js';

export const taskSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable(),
  status: taskStatusSchema,
  priority: prioritySchema,
  sortOrder: z.number().int().min(0),
  priorityScore: z.number(),
  importance: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  effort: z.number().int().min(1).max(5),
  areaId: idSchema.nullable(),
  trackId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  problemId: idSchema.nullable(),
  dueDate: isoDateString.nullable(),
  estimatedMinutes: z.number().int().nullable(),
  actualMinutes: z.number().int().nullable(),
  costAmount: z.number().nullable(),
  costCurrency: z.string().nullable(),
  source: taskSourceSchema,
  reason: z.string().max(2000).nullable(),
  recurrenceId: idSchema.nullable(),
  isRecurringTemplate: z.boolean(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  completedAt: isoDateString.nullable(),
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  importance: z.number().int().min(1).max(5).optional(),
  urgency: z.number().int().min(1).max(5).optional(),
  effort: z.number().int().min(1).max(5).optional(),
  areaId: idSchema.optional().nullable(),
  trackId: idSchema.optional().nullable(),
  goalId: idSchema.optional().nullable(),
  problemId: idSchema.optional().nullable(),
  dueDate: isoDateString.optional().nullable(),
  estimatedMinutes: z.number().int().min(0).max(60 * 24).optional(),
  costAmount: z.number().min(0).optional(),
  costCurrency: currencySchema.optional(),
  source: taskSourceSchema.optional(),
  reason: z.string().max(2000).optional(),
  recurrenceId: idSchema.optional().nullable(),
  isRecurringTemplate: z.boolean().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = createTaskInputSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const completeTaskInputSchema = z.object({
  timeSpentMinutes: z.number().int().min(0).max(60 * 24).optional(),
  costAmount: z.number().min(0).optional(),
  costCurrency: currencySchema.optional(),
  note: z.string().max(4000).optional(),
});
export type CompleteTaskInput = z.infer<typeof completeTaskInputSchema>;

export const taskFiltersSchema = z.object({
  areaId: idSchema.optional(),
  trackId: idSchema.optional(),
  goalId: idSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  source: taskSourceSchema.optional(),
  filter: z
    .enum(['today', 'high_priority', 'no_deadline', 'blocked', 'done', 'open', 'ai', 'manual'])
    .optional(),
  hideRecurringTemplates: z.coerce.boolean().optional(),
});
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
