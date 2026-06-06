import { z } from 'zod';

export const idSchema = z.string().min(1);

export const isoDateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid ISO date' });

export const prioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type Priority = z.infer<typeof prioritySchema>;

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'blocked', 'done', 'cancelled']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const goalStatusSchema = z.enum(['active', 'paused', 'done', 'archived']);
export type GoalStatus = z.infer<typeof goalStatusSchema>;

export const problemStatusSchema = z.enum(['open', 'planning', 'resolved']);
export type ProblemStatus = z.infer<typeof problemStatusSchema>;

export const areaStatusSchema = z.enum(['active', 'paused', 'archived']);
export type AreaStatus = z.infer<typeof areaStatusSchema>;

export const taskSourceSchema = z.enum(['manual', 'ai']);
export type TaskSource = z.infer<typeof taskSourceSchema>;

export const logKindSchema = z.enum(['completion', 'expense', 'study', 'note', 'decision', 'task_created']);
export type LogKind = z.infer<typeof logKindSchema>;

export const confidenceSchema = z.enum(['low', 'medium', 'high']);
export type Confidence = z.infer<typeof confidenceSchema>;

export const currencySchema = z.string().min(1).max(8).default('EUR');

export const reorderInputSchema = z.object({
  orderedIds: z.array(idSchema).min(1).max(200),
});
export type ReorderInput = z.infer<typeof reorderInputSchema>;
