import { z } from 'zod';
import { idSchema } from './common.js';

export const streakDaySchema = z.object({
  date: z.string(),
  count: z.number().int().min(0),
});
export type StreakDay = z.infer<typeof streakDaySchema>;

export const streakResponseSchema = z.object({
  days: z.array(streakDaySchema),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  totalCompletions: z.number().int().min(0),
  areaId: idSchema.nullable().optional(),
});
export type StreakResponse = z.infer<typeof streakResponseSchema>;

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;
