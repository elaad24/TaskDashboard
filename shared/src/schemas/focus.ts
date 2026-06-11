import { z } from 'zod';
import { idSchema, isoDateString } from './common.js';

export const focusActivityTypeSchema = z.enum([
  'study',
  'work',
  'exercise',
  'reading',
  'chores',
  'creative',
  'other',
]);
export type FocusActivityType = z.infer<typeof focusActivityTypeSchema>;

export const LEARNING_ACTIVITY_TYPES: Array<FocusActivityType> = [
  'study',
  'reading',
  'work',
  'creative',
];

export const isLearningActivityType = (type: FocusActivityType): boolean =>
  LEARNING_ACTIVITY_TYPES.includes(type);

export const distractionCategorySchema = z.enum([
  'phone_social',
  'physical_need',
  'interruption',
  'boredom_fatigue',
  'task_switch',
  'planned_break',
  'other',
]);
export type DistractionCategory = z.infer<typeof distractionCategorySchema>;

export const focusRangeSchema = z.enum(['today', 'week', 'month', 'year', 'all']);
export type FocusRange = z.infer<typeof focusRangeSchema>;

export const focusLinkModeSchema = z.enum([
  'existing_topic',
  'task',
  'goal',
  'new_topic',
  'none',
]);
export type FocusLinkMode = z.infer<typeof focusLinkModeSchema>;

export const focusNewTopicInputSchema = z.object({
  subject: z.string().min(1).max(200),
  topic: z.string().min(1).max(200),
  areaId: idSchema.optional().nullable(),
});
export type FocusNewTopicInput = z.infer<typeof focusNewTopicInputSchema>;

export const focusSessionSchema = z.object({
  id: idSchema,
  activityType: focusActivityTypeSchema,
  activityNote: z.string().nullable(),
  description: z.string().nullable(),
  isLearning: z.boolean(),
  startedAt: isoDateString,
  endedAt: isoDateString,
  durationSeconds: z.number().int().min(0),
  stopReason: z.string().min(1).max(500),
  distractionCategory: distractionCategorySchema,
  logId: idSchema.nullable(),
  studyTopicId: idSchema.nullable(),
  taskId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  areaId: idSchema.nullable(),
  createdAt: isoDateString,
});
export type FocusSession = z.infer<typeof focusSessionSchema>;

export const createFocusSessionInputSchema = z.object({
  activityType: focusActivityTypeSchema,
  activityNote: z.string().max(200).optional(),
  description: z.string().max(8000).optional(),
  startedAt: isoDateString,
  endedAt: isoDateString,
  durationSeconds: z.number().int().min(1).max(86400),
  stopReason: z.string().min(1).max(500),
  linkMode: focusLinkModeSchema.optional().default('none'),
  studyTopicId: idSchema.optional(),
  taskId: idSchema.optional(),
  goalId: idSchema.optional(),
  areaId: idSchema.optional().nullable(),
  newTopic: focusNewTopicInputSchema.optional(),
});
export type CreateFocusSessionInput = z.infer<typeof createFocusSessionInputSchema>;

export const focusSuggestInputSchema = z.object({
  description: z.string().min(1).max(8000),
  activityType: focusActivityTypeSchema,
});
export type FocusSuggestInput = z.infer<typeof focusSuggestInputSchema>;

export const focusCandidateTopicSchema = z.object({
  id: idSchema,
  subject: z.string().min(1).max(200),
  topic: z.string().min(1).max(200),
  reason: z.string().min(1).max(300),
});

export const focusCandidateTaskSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
});

export const focusCandidateGoalSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
});

export const focusSuggestResponseSchema = z.object({
  isLearning: z.boolean(),
  candidateTopics: z.array(focusCandidateTopicSchema).max(5),
  candidateTasks: z.array(focusCandidateTaskSchema).max(5),
  candidateGoals: z.array(focusCandidateGoalSchema).max(5),
  proposedTopic: focusNewTopicInputSchema.nullable(),
});
export type FocusSuggestResponse = z.infer<typeof focusSuggestResponseSchema>;

export const focusDistractionBreakdownSchema = z.object({
  category: distractionCategorySchema,
  count: z.number().int().min(0),
  totalDurationSeconds: z.number().int().min(0),
  avgDurationSeconds: z.number().min(0),
});

export const focusActivityBreakdownSchema = z.object({
  activityType: focusActivityTypeSchema,
  count: z.number().int().min(0),
  totalDurationSeconds: z.number().int().min(0),
  avgDurationSeconds: z.number().min(0),
});

export const focusStatsSchema = z.object({
  range: focusRangeSchema,
  totalSessions: z.number().int().min(0),
  totalDurationSeconds: z.number().int().min(0),
  avgDurationSeconds: z.number().min(0),
  byDistraction: z.array(focusDistractionBreakdownSchema),
  byActivity: z.array(focusActivityBreakdownSchema),
  topDistractions: z.array(focusDistractionBreakdownSchema).max(3),
});
export type FocusStats = z.infer<typeof focusStatsSchema>;

export const focusInsightTopDistractionSchema = z.object({
  category: distractionCategorySchema,
  count: z.number().int().min(0),
  label: z.string().min(1).max(100),
});
export type FocusInsightTopDistraction = z.infer<typeof focusInsightTopDistractionSchema>;

export const focusInsightSchema = z.object({
  id: idSchema,
  generatedAt: isoDateString,
  sessionsAnalyzed: z.number().int().min(0),
  topDistractions: z.array(focusInsightTopDistractionSchema),
  advice: z.string().min(1),
  stats: focusStatsSchema,
  createdAt: isoDateString,
});
export type FocusInsight = z.infer<typeof focusInsightSchema>;

export const FOCUS_ACTIVITY_LABELS: Record<FocusActivityType, string> = {
  study: 'Study',
  work: 'Work',
  exercise: 'Exercise',
  reading: 'Reading',
  chores: 'Chores',
  creative: 'Creative',
  other: 'Other',
};

export const DISTRACTION_CATEGORY_LABELS: Record<DistractionCategory, string> = {
  phone_social: 'Phone / Social',
  physical_need: 'Physical need',
  interruption: 'Interruption',
  boredom_fatigue: 'Boredom / Fatigue',
  task_switch: 'Task switch',
  planned_break: 'Planned break',
  other: 'Other',
};
