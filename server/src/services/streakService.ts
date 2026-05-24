import type { StreakResponse } from '@command-center/shared';
import { prisma } from '../db.js';

const STREAK_WINDOW_DAYS = 84;

const startOfDay = (date: Date): Date => {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
};

const daysAgo = (days: number): Date => {
  const out = startOfDay(new Date());
  out.setDate(out.getDate() - days);
  return out;
};

const toIsoDay = (date: Date): string => startOfDay(date).toISOString().slice(0, 10);

const computeStreaks = (activeDays: Set<string>): { current: number; longest: number } => {
  const sorted = Array.from(activeDays).sort();
  if (sorted.length === 0) return { current: 0, longest: 0 };

  let longest = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(sorted[i - 1]!);
    const curr = new Date(sorted[i]!);
    const diff = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (diff === 1) {
      run += 1;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  const today = toIsoDay(new Date());
  let current = 0;
  let cursor = new Date(today);
  while (activeDays.has(toIsoDay(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
};

export const buildStreak = async (areaId?: string | null): Promise<StreakResponse> => {
  const since = daysAgo(STREAK_WINDOW_DAYS - 1);

  const completions = await prisma.task.findMany({
    where: {
      status: 'done',
      completedAt: { gte: since },
      ...(areaId ? { areaId } : {}),
    },
    select: { completedAt: true },
  });

  const countMap = new Map<string, number>();
  for (let i = STREAK_WINDOW_DAYS - 1; i >= 0; i -= 1) {
    countMap.set(toIsoDay(daysAgo(i)), 0);
  }

  completions.forEach((row) => {
    if (!row.completedAt) return;
    const key = toIsoDay(row.completedAt);
    if (countMap.has(key)) countMap.set(key, (countMap.get(key) ?? 0) + 1);
  });

  const activeDays = new Set<string>();
  countMap.forEach((count, date) => {
    if (count > 0) activeDays.add(date);
  });

  const { current, longest } = computeStreaks(activeDays);
  const totalCompletions = completions.length;

  return {
    days: Array.from(countMap.entries()).map(([date, count]) => ({ date, count })),
    currentStreak: current,
    longestStreak: longest,
    totalCompletions,
    areaId: areaId ?? null,
  };
};
