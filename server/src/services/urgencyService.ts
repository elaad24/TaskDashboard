import type { UrgencyMetric, UrgencyResponse, UrgencyStatus } from '@command-center/shared';
import { prisma } from '../db.js';

const DEFAULT_CURRENCY = 'EUR';
const BEHIND_THRESHOLD = -20;
const CRITICAL_THRESHOLD = -50;
const AHEAD_THRESHOLD = 20;

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

const startOfWeek = (): Date => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const toIsoDay = (date: Date): string => startOfDay(date).toISOString().slice(0, 10);

const classifyDelta = (deltaPct: number, invert = false): UrgencyStatus => {
  const pct = invert ? -deltaPct : deltaPct;
  if (pct <= CRITICAL_THRESHOLD) return 'critical';
  if (pct <= BEHIND_THRESHOLD) return 'behind';
  if (pct >= AHEAD_THRESHOLD) return 'ahead';
  return 'on_track';
};

const computeDeltaPct = (value: number, baseline: number): number => {
  if (baseline <= 0) return value > 0 ? 100 : 0;
  return Math.round(((value - baseline) / baseline) * 100);
};

const rollingWeeklyAverage = (counts: Array<number>): number => {
  if (counts.length === 0) return 0;
  const sum = counts.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / counts.length) * 10) / 10;
};

const buildTrend14d = (map: Map<string, number>): Array<{ date: string; value: number }> => {
  const out: Array<{ date: string; value: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = toIsoDay(daysAgo(i));
    out.push({ date: day, value: map.get(day) ?? 0 });
  }
  return out;
};

const worstStatus = (statuses: Array<UrgencyStatus>): UrgencyStatus => {
  const rank: Record<UrgencyStatus, number> = {
    critical: 4,
    behind: 3,
    on_track: 2,
    ahead: 1,
  };
  return statuses.reduce((worst, s) => (rank[s] > rank[worst] ? s : worst), 'ahead' as UrgencyStatus);
};

export const buildUrgency = async (): Promise<UrgencyResponse> => {
  const now = new Date();
  const weekStart = startOfWeek();
  const horizon14 = daysAgo(13);
  const fourWeeksAgo = daysAgo(28);

  const [
    tasksCompletedThisWeek,
    studyMinutesAgg,
    spendWeekAgg,
    overdueTasks,
    completions14d,
    studyLogs14d,
    spendLogs14d,
    completions4w,
    studyWeeks4w,
    spendWeeks4w,
    goalLinkedTasksWeek,
    goalLinkedTasks4w,
  ] = await Promise.all([
    prisma.task.count({ where: { status: 'done', completedAt: { gte: weekStart } } }),
    prisma.log.aggregate({
      where: { kind: 'study', occurredAt: { gte: weekStart } },
      _sum: { timeSpentMinutes: true },
    }),
    prisma.log.aggregate({
      where: { occurredAt: { gte: weekStart }, costAmount: { not: null } },
      _sum: { costAmount: true },
    }),
    prisma.task.count({
      where: {
        status: { notIn: ['done', 'cancelled'] },
        isRecurringTemplate: false,
        dueDate: { lt: now },
      },
    }),
    prisma.task.findMany({
      where: { status: 'done', completedAt: { gte: horizon14 } },
      select: { completedAt: true },
    }),
    prisma.log.findMany({
      where: { kind: 'study', occurredAt: { gte: horizon14 } },
      select: { occurredAt: true, timeSpentMinutes: true },
    }),
    prisma.log.findMany({
      where: { occurredAt: { gte: horizon14 }, costAmount: { not: null } },
      select: { occurredAt: true, costAmount: true },
    }),
    prisma.task.findMany({
      where: { status: 'done', completedAt: { gte: fourWeeksAgo, lt: weekStart } },
      select: { completedAt: true },
    }),
    prisma.log.findMany({
      where: { kind: 'study', occurredAt: { gte: fourWeeksAgo, lt: weekStart } },
      select: { occurredAt: true, timeSpentMinutes: true },
    }),
    prisma.log.findMany({
      where: { occurredAt: { gte: fourWeeksAgo, lt: weekStart }, costAmount: { not: null } },
      select: { occurredAt: true, costAmount: true },
    }),
    prisma.task.count({
      where: { status: 'done', completedAt: { gte: weekStart }, goalId: { not: null } },
    }),
    prisma.task.findMany({
      where: {
        status: 'done',
        completedAt: { gte: fourWeeksAgo, lt: weekStart },
        goalId: { not: null },
      },
      select: { completedAt: true },
    }),
  ]);

  const completionMap = new Map<string, number>();
  for (let i = 0; i < 14; i += 1) completionMap.set(toIsoDay(daysAgo(13 - i)), 0);
  completions14d.forEach((row) => {
    if (!row.completedAt) return;
    const key = toIsoDay(row.completedAt);
    completionMap.set(key, (completionMap.get(key) ?? 0) + 1);
  });

  const studyMap = new Map<string, number>();
  for (let i = 0; i < 14; i += 1) studyMap.set(toIsoDay(daysAgo(13 - i)), 0);
  studyLogs14d.forEach((row) => {
    const key = toIsoDay(row.occurredAt);
    studyMap.set(key, (studyMap.get(key) ?? 0) + (row.timeSpentMinutes ?? 0));
  });

  const spendMap = new Map<string, number>();
  for (let i = 0; i < 14; i += 1) spendMap.set(toIsoDay(daysAgo(13 - i)), 0);
  spendLogs14d.forEach((row) => {
    const key = toIsoDay(row.occurredAt);
    spendMap.set(key, (spendMap.get(key) ?? 0) + (row.costAmount ?? 0));
  });

  const bucketByWeek = (dates: Array<{ completedAt: Date | null }>): Array<number> => {
    const buckets = [0, 0, 0, 0];
    dates.forEach((row) => {
      if (!row.completedAt) return;
      const diffDays = Math.floor((weekStart.getTime() - row.completedAt.getTime()) / 86_400_000);
      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex >= 0 && weekIndex < 4) {
        buckets[weekIndex] = (buckets[weekIndex] ?? 0) + 1;
      }
    });
    return buckets.reverse();
  };

  const bucketStudyByWeek = (
    rows: Array<{ occurredAt: Date; timeSpentMinutes: number | null }>,
  ): Array<number> => {
    const buckets = [0, 0, 0, 0];
    rows.forEach((row) => {
      const diffDays = Math.floor((weekStart.getTime() - row.occurredAt.getTime()) / 86_400_000);
      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex >= 0 && weekIndex < 4) {
        buckets[weekIndex] = (buckets[weekIndex] ?? 0) + (row.timeSpentMinutes ?? 0);
      }
    });
    return buckets.reverse();
  };

  const bucketSpendByWeek = (
    rows: Array<{ occurredAt: Date; costAmount: number | null }>,
  ): Array<number> => {
    const buckets = [0, 0, 0, 0];
    rows.forEach((row) => {
      const diffDays = Math.floor((weekStart.getTime() - row.occurredAt.getTime()) / 86_400_000);
      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex >= 0 && weekIndex < 4) {
        buckets[weekIndex] = (buckets[weekIndex] ?? 0) + (row.costAmount ?? 0);
      }
    });
    return buckets.reverse();
  };

  const tasksBaseline = rollingWeeklyAverage(bucketByWeek(completions4w));
  const studyValue = studyMinutesAgg._sum.timeSpentMinutes ?? 0;
  const studyBaseline = rollingWeeklyAverage(bucketStudyByWeek(studyWeeks4w));
  const spendValue = Math.round((spendWeekAgg._sum.costAmount ?? 0) * 100) / 100;
  const spendBaseline = rollingWeeklyAverage(bucketSpendByWeek(spendWeeks4w));

  const goalLinkedBaseline = rollingWeeklyAverage(bucketByWeek(goalLinkedTasks4w));

  const metrics: Array<UrgencyMetric> = [
    {
      key: 'tasksCompleted',
      label: 'Tasks completed',
      value: tasksCompletedThisWeek,
      baseline: tasksBaseline,
      deltaPct: computeDeltaPct(tasksCompletedThisWeek, tasksBaseline),
      status: classifyDelta(computeDeltaPct(tasksCompletedThisWeek, tasksBaseline)),
      unit: 'tasks',
      trend14d: buildTrend14d(completionMap),
    },
    {
      key: 'studyMinutes',
      label: 'Study time',
      value: studyValue,
      baseline: studyBaseline,
      deltaPct: computeDeltaPct(studyValue, studyBaseline),
      status: classifyDelta(computeDeltaPct(studyValue, studyBaseline)),
      unit: 'min',
      trend14d: buildTrend14d(studyMap),
    },
    {
      key: 'spend',
      label: 'Weekly spend',
      value: spendValue,
      baseline: spendBaseline,
      deltaPct: computeDeltaPct(spendValue, spendBaseline),
      status: classifyDelta(computeDeltaPct(spendValue, spendBaseline), true),
      unit: DEFAULT_CURRENCY,
      invert: true,
      trend14d: buildTrend14d(spendMap),
    },
    {
      key: 'goalProgress',
      label: 'Goal momentum',
      value: goalLinkedTasksWeek,
      baseline: goalLinkedBaseline,
      deltaPct: computeDeltaPct(goalLinkedTasksWeek, goalLinkedBaseline),
      status: classifyDelta(computeDeltaPct(goalLinkedTasksWeek, goalLinkedBaseline)),
      unit: 'tasks',
      trend14d: buildTrend14d(completionMap),
    },
  ];

  const overallStatus = worstStatus(metrics.map((m) => m.status));

  const worstMetric = metrics
    .filter((m) => m.status === 'behind' || m.status === 'critical')
    .sort((a, b) => a.deltaPct - b.deltaPct)[0];

  const parts: Array<string> = [overallStatus.toUpperCase().replace('_', ' ')];
  if (worstMetric) {
    parts.push(`${worstMetric.deltaPct > 0 ? '+' : ''}${worstMetric.deltaPct}% ${worstMetric.label.toLowerCase()}`);
  }
  if (overdueTasks > 0) parts.push(`${overdueTasks} overdue`);
  const spendMetric = metrics.find((m) => m.key === 'spend');
  if (spendMetric && (spendMetric.status === 'behind' || spendMetric.status === 'critical')) {
    parts.push('over budget');
  }

  return {
    overallStatus,
    summary: parts.join(' · '),
    overdueTasks,
    currency: DEFAULT_CURRENCY,
    metrics,
    generatedAt: new Date().toISOString(),
  };
};
