import { z } from 'zod';
import { taskSchema } from './task.js';
import { goalSchema } from './goal.js';
import { problemSchema } from './problem.js';
import { logSchema } from './log.js';
import { areaSchema } from './area.js';
import { studyTopicSchema } from './study.js';
import { idSchema } from './common.js';

export const missionBriefingSchema = z.object({
  mainFocus: z.string(),
  why: z.string(),
  recommendedMinutes: z.number().int().min(0),
  primaryAction: z.string(),
  navigatorMessage: z.string().nullable(),
  generatedAt: z.string(),
});
export type MissionBriefing = z.infer<typeof missionBriefingSchema>;

export const dashboardAreaCardSchema = areaSchema.extend({
  openTaskCount: z.number().int(),
  blockedCount: z.number().int(),
  nextAction: z.string().nullable(),
});
export type DashboardAreaCard = z.infer<typeof dashboardAreaCardSchema>;

export const budgetSnapshotSchema = z.object({
  monthSpend: z.number(),
  weekSpend: z.number(),
  currency: z.string(),
  byArea: z.array(
    z.object({
      areaId: idSchema.nullable(),
      areaName: z.string(),
      total: z.number(),
    }),
  ),
});
export type BudgetSnapshot = z.infer<typeof budgetSnapshotSchema>;

export const studySnapshotSchema = z.object({
  topicCount: z.number().int(),
  weakTopics: z.array(z.string()),
  averageMockScore: z.number().nullable(),
  minutesThisWeek: z.number().int(),
});
export type StudySnapshot = z.infer<typeof studySnapshotSchema>;

export const dashboardLogSchema = logSchema.extend({
  taskTitle: z.string().nullable(),
  /** Populated when the log is linked to a task (e.g. task_created, completion). */
  task: taskSchema.nullable().optional(),
  areaName: z.string().nullable().optional(),
});
export type DashboardLog = z.infer<typeof dashboardLogSchema>;

export const dashboardResponseSchema = z.object({
  briefing: missionBriefingSchema.nullable(),
  nextActions: z.array(taskSchema),
  activeGoals: z.array(goalSchema),
  tracks: z.array(dashboardAreaCardSchema),
  problems: z.array(problemSchema),
  recentLogs: z.array(dashboardLogSchema),
  budget: budgetSnapshotSchema,
  study: studySnapshotSchema,
  weakStudyTopics: z.array(studyTopicSchema),
});
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
