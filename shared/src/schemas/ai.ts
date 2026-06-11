import { z } from 'zod';
import { createTaskInputSchema } from './task.js';
import { createGoalInputSchema } from './goal.js';
import { createProblemInputSchema } from './problem.js';
import { createStudyTopicInputSchema } from './study.js';
import { createLogInputSchema } from './log.js';
import { createResourceInputSchema } from './resource.js';
import { idSchema, isoDateString, prioritySchema } from './common.js';

// ---------------------------------------------------------------------------
// Brain Dump Parser
// ---------------------------------------------------------------------------

export const parseInputSchema = z.object({
  text: z.string().min(1).max(8000),
  correction: z.string().min(1).max(2000).optional(),
});
export type ParseInput = z.infer<typeof parseInputSchema>;

export const parsedItemKindSchema = z.enum([
  'task',
  'goal',
  'problem',
  'expense',
  'note',
  'study_weakness',
  'resource',
  'decision',
]);
export type ParsedItemKind = z.infer<typeof parsedItemKindSchema>;

export const suggestedTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  estimatedMinutes: z.number().int().min(1).max(60 * 24).optional().nullable(),
  priority: prioritySchema.optional(),
  reason: z.string().max(1000).optional().nullable(),
});
export type SuggestedTask = z.infer<typeof suggestedTaskSchema>;

export const parsedItemSchema = z.object({
  kind: parsedItemKindSchema,
  title: z.string().min(1).max(200),
  summary: z.string().max(1000).optional().nullable(),
  area: z.string().max(120).optional().nullable(),
  track: z.string().max(120).optional().nullable(),
  priority: prioritySchema.optional(),
  costAmount: z.number().min(0).optional().nullable(),
  costCurrency: z.string().max(8).optional().nullable(),
  occurredAt: isoDateString.optional().nullable(),
  suggestedTasks: z.array(suggestedTaskSchema).optional(),
  followUpQuestion: z.string().max(500).optional().nullable(),
});
export type ParsedItem = z.infer<typeof parsedItemSchema>;

export const parseResponseSchema = z.object({
  items: z.array(parsedItemSchema),
  navigatorMessage: z.string().max(1000).optional().nullable(),
  isSimpleTask: z.boolean(),
});
export type ParseResponse = z.infer<typeof parseResponseSchema>;

// ---------------------------------------------------------------------------
// Confirm parsed items -> persist
// ---------------------------------------------------------------------------

export const confirmParseInputSchema = z.object({
  tasks: z.array(createTaskInputSchema).optional(),
  goals: z.array(createGoalInputSchema).optional(),
  problems: z.array(createProblemInputSchema).optional(),
  studyTopics: z.array(createStudyTopicInputSchema).optional(),
  logs: z.array(createLogInputSchema).optional(),
  resources: z.array(createResourceInputSchema).optional(),
});
export type ConfirmParseInput = z.infer<typeof confirmParseInputSchema>;

export const confirmParseResponseSchema = z.object({
  createdTaskIds: z.array(idSchema),
  createdGoalIds: z.array(idSchema),
  createdProblemIds: z.array(idSchema),
  createdStudyTopicIds: z.array(idSchema),
  createdLogIds: z.array(idSchema),
});
export type ConfirmParseResponse = z.infer<typeof confirmParseResponseSchema>;

// ---------------------------------------------------------------------------
// Next Best Action engine
// ---------------------------------------------------------------------------

export const nextActionInputSchema = z.object({
  availableMinutes: z.number().int().min(5).max(60 * 12).optional(),
  context: z.string().max(2000).optional(),
});
export type NextActionInput = z.infer<typeof nextActionInputSchema>;

export const nextActionRecommendationSchema = z.object({
  taskId: idSchema.optional().nullable(),
  title: z.string().min(1).max(200),
  reason: z.string().max(1000),
  estimatedMinutes: z.number().int().min(1).max(60 * 12),
  area: z.string().max(120).optional().nullable(),
});
export type NextActionRecommendation = z.infer<typeof nextActionRecommendationSchema>;

export const nextActionResponseSchema = z.object({
  primary: nextActionRecommendationSchema,
  backup: nextActionRecommendationSchema.optional().nullable(),
  navigatorMessage: z.string().max(1000).optional().nullable(),
});
export type NextActionResponse = z.infer<typeof nextActionResponseSchema>;

// ---------------------------------------------------------------------------
// Goal breakdown
// ---------------------------------------------------------------------------

export const goalBreakdownInputSchema = z.object({
  goalId: idSchema,
  context: z.string().max(2000).optional(),
});
export type GoalBreakdownInput = z.infer<typeof goalBreakdownInputSchema>;

export const goalBreakdownResponseSchema = z.object({
  milestones: z.array(z.object({ title: z.string().min(1).max(200), order: z.number().int() })),
  tasks: z.array(suggestedTaskSchema),
  risks: z.array(z.string().max(500)),
  blockers: z.array(z.string().max(500)),
  firstAction: z.string().max(500),
  navigatorMessage: z.string().max(1000).optional().nullable(),
});
export type GoalBreakdownResponse = z.infer<typeof goalBreakdownResponseSchema>;

// ---------------------------------------------------------------------------
// Problem solver
// ---------------------------------------------------------------------------

export const solveProblemInputSchema = z.object({
  problemId: idSchema,
  context: z.string().max(2000).optional(),
});
export type SolveProblemInput = z.infer<typeof solveProblemInputSchema>;

export const solveProblemResponseSchema = z.object({
  interpretation: z.string().max(2000),
  plan: z.array(z.string().max(500)),
  suggestedTasks: z.array(suggestedTaskSchema),
  navigatorMessage: z.string().max(1000).optional().nullable(),
});
export type SolveProblemResponse = z.infer<typeof solveProblemResponseSchema>;

// ---------------------------------------------------------------------------
// Search summary
// ---------------------------------------------------------------------------

export const searchInputSchema = z.object({
  q: z.string().min(1).max(500),
  types: z
    .array(z.enum(['task', 'log', 'goal', 'problem', 'studyTopic']))
    .optional(),
  summarize: z.coerce.boolean().optional().default(true),
});
export type SearchInput = z.infer<typeof searchInputSchema>;

export const searchHitSchema = z.object({
  id: idSchema,
  type: z.enum(['task', 'log', 'goal', 'problem', 'studyTopic']),
  title: z.string(),
  snippet: z.string().nullable(),
  occurredAt: z.string().nullable(),
  costAmount: z.number().nullable(),
  costCurrency: z.string().nullable(),
  areaId: idSchema.nullable().optional(),
});
export type SearchHit = z.infer<typeof searchHitSchema>;

export const searchResponseSchema = z.object({
  hits: z.array(searchHitSchema),
  summary: z.string().max(4000).nullable(),
  totals: z.object({
    count: z.number().int(),
    totalCost: z.number().optional().nullable(),
    totalMinutes: z.number().int().optional().nullable(),
  }),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;
