import { z } from 'zod';
import { idSchema, isoDateString } from './common.js';

export const overviewKpisSchema = z.object({
  tasksOpen: z.number().int(),
  tasksOverdue: z.number().int(),
  tasksCompletedThisWeek: z.number().int(),
  goalsActive: z.number().int(),
  goalsCompletedThisMonth: z.number().int(),
  problemsOpen: z.number().int(),
  studyMinutesThisWeek: z.number().int(),
  spendThisWeek: z.number(),
});
export type OverviewKpis = z.infer<typeof overviewKpisSchema>;

export const overviewAreaSchema = z.object({
  id: idSchema,
  name: z.string(),
  color: z.string().nullable(),
  goalsProgressPct: z.number().min(0).max(100),
  openTasks: z.number().int(),
  lastActivityAt: isoDateString.nullable(),
});

export const overviewTrendPointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

export const overviewRiskItemSchema = z.object({
  id: idSchema,
  title: z.string(),
  dueDate: isoDateString.nullable().optional(),
  updatedAt: isoDateString.nullable().optional(),
});

export const overviewResponseSchema = z.object({
  kpis: overviewKpisSchema,
  areas: z.array(overviewAreaSchema),
  trends: z.object({
    completions14d: z.array(overviewTrendPointSchema),
    spend14d: z.array(overviewTrendPointSchema),
  }),
  risks: z.object({
    overdueTasks: z.array(overviewRiskItemSchema),
    staleGoals: z.array(overviewRiskItemSchema),
    oldOpenProblems: z.array(overviewRiskItemSchema),
    staleStudyTopics: z.array(overviewRiskItemSchema),
  }),
  upcomingReminders: z.array(
    z.object({
      id: idSchema,
      title: z.string(),
      scheduledFor: isoDateString,
      status: z.string(),
    }),
  ),
});
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;

export const overviewBriefingResponseSchema = z.object({
  headline: z.string().min(1).max(300),
  bullets: z.array(z.string().min(1).max(500)).min(3).max(5),
  recommendedFocus: z.string().min(1).max(500),
});
export type OverviewBriefingResponse = z.infer<typeof overviewBriefingResponseSchema>;
