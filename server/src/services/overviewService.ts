import type { OverviewResponse } from '@command-center/shared';
import { prisma } from '../db.js';

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

export const buildOverview = async (): Promise<OverviewResponse> => {
  const now = new Date();
  const weekStart = daysAgo(7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const horizon14 = daysAgo(13);

  const [areas, goals, openTasks, overdueTasksCount, doneThisWeek, problemsOpen, goalsCompletedMonth, reminders] =
    await Promise.all([
      prisma.area.findMany({ orderBy: { order: 'asc' } }),
      prisma.goal.findMany({ orderBy: { updatedAt: 'desc' } }),
      prisma.task.findMany({
        where: { status: { notIn: ['done', 'cancelled'] }, isRecurringTemplate: false },
      }),
      prisma.task.count({
        where: {
          status: { notIn: ['done', 'cancelled'] },
          isRecurringTemplate: false,
          dueDate: { lt: now },
        },
      }),
      prisma.task.count({ where: { status: 'done', completedAt: { gte: weekStart } } }),
      prisma.problem.count({ where: { status: { in: ['open', 'planning'] } } }),
      prisma.goal.count({ where: { status: 'done', completedAt: { gte: monthStart } } }),
      prisma.reminder.findMany({
        where: { status: { in: ['pending', 'snoozed'] } },
        orderBy: { scheduledFor: 'asc' },
        take: 5,
      }),
    ]);

  const studyMinutesWeek = await prisma.log.aggregate({
    where: { kind: 'study', occurredAt: { gte: weekStart } },
    _sum: { timeSpentMinutes: true },
  });
  const spendWeek = await prisma.log.aggregate({
    where: { occurredAt: { gte: weekStart }, costAmount: { not: null } },
    _sum: { costAmount: true },
  });

  const completions = await prisma.task.findMany({
    where: { status: 'done', completedAt: { gte: horizon14 } },
    select: { completedAt: true },
  });
  const spendLogs = await prisma.log.findMany({
    where: { occurredAt: { gte: horizon14 }, costAmount: { not: null } },
    select: { occurredAt: true, costAmount: true },
  });

  const completionMap = new Map<string, number>();
  const spendMap = new Map<string, number>();
  for (let i = 0; i < 14; i += 1) {
    const day = toIsoDay(daysAgo(13 - i));
    completionMap.set(day, 0);
    spendMap.set(day, 0);
  }
  completions.forEach((row) => {
    if (!row.completedAt) return;
    const key = toIsoDay(row.completedAt);
    completionMap.set(key, (completionMap.get(key) ?? 0) + 1);
  });
  spendLogs.forEach((row) => {
    const key = toIsoDay(row.occurredAt);
    spendMap.set(key, (spendMap.get(key) ?? 0) + (row.costAmount ?? 0));
  });

  const staleGoalThreshold = daysAgo(14);
  const staleProblemThreshold = daysAgo(7);
  const staleGoals = await prisma.goal.findMany({
    where: { status: 'active', updatedAt: { lt: staleGoalThreshold } },
    orderBy: { updatedAt: 'asc' },
    take: 5,
  });
  const oldProblems = await prisma.problem.findMany({
    where: { status: { in: ['open', 'planning'] }, createdAt: { lt: staleProblemThreshold } },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });
  const staleStudyTopics = await prisma.studyTopic.findMany({
    where: { nextReviewAt: { lt: now } },
    orderBy: { nextReviewAt: 'asc' },
    take: 5,
  });
  const overdueTasks = await prisma.task.findMany({
    where: { status: { notIn: ['done', 'cancelled'] }, dueDate: { lt: now } },
    orderBy: { dueDate: 'asc' },
    take: 5,
  });

  const areasWithProgress = await Promise.all(
    areas.map(async (area) => {
      const [areaGoals, areaOpenTasks, lastTask, lastLog] = await Promise.all([
        prisma.goal.findMany({
          where: { areaId: area.id, status: { in: ['active', 'paused'] } },
          select: { progress: true },
        }),
        prisma.task.count({
          where: { areaId: area.id, status: { notIn: ['done', 'cancelled'] }, isRecurringTemplate: false },
        }),
        prisma.task.findFirst({
          where: { areaId: area.id },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
        prisma.log.findFirst({
          where: { areaId: area.id },
          orderBy: { occurredAt: 'desc' },
          select: { occurredAt: true },
        }),
      ]);
      const avgGoalProgress =
        areaGoals.length === 0
          ? 0
          : areaGoals.reduce((sum, goal) => sum + goal.progress, 0) / areaGoals.length;
      const lastActivity =
        lastTask?.updatedAt && lastLog?.occurredAt
          ? new Date(Math.max(lastTask.updatedAt.getTime(), lastLog.occurredAt.getTime()))
          : (lastTask?.updatedAt ?? lastLog?.occurredAt ?? null);
      return {
        id: area.id,
        name: area.name,
        color: area.color,
        goalsProgressPct: Math.round(avgGoalProgress),
        openTasks: areaOpenTasks,
        lastActivityAt: lastActivity ? lastActivity.toISOString() : null,
      };
    }),
  );

  return {
    kpis: {
      tasksOpen: openTasks.length,
      tasksOverdue: overdueTasksCount,
      tasksCompletedThisWeek: doneThisWeek,
      goalsActive: goals.filter((goal) => goal.status === 'active').length,
      goalsCompletedThisMonth: goalsCompletedMonth,
      problemsOpen,
      studyMinutesThisWeek: studyMinutesWeek._sum.timeSpentMinutes ?? 0,
      spendThisWeek: spendWeek._sum.costAmount ?? 0,
    },
    areas: areasWithProgress,
    trends: {
      completions14d: Array.from(completionMap.entries()).map(([date, value]) => ({ date, value })),
      spend14d: Array.from(spendMap.entries()).map(([date, value]) => ({ date, value })),
    },
    risks: {
      overdueTasks: overdueTasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate?.toISOString() ?? null,
      })),
      staleGoals: staleGoals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        updatedAt: goal.updatedAt.toISOString(),
      })),
      oldOpenProblems: oldProblems.map((problem) => ({
        id: problem.id,
        title: problem.title,
        updatedAt: problem.updatedAt.toISOString(),
      })),
      staleStudyTopics: staleStudyTopics.map((topic) => ({
        id: topic.id,
        title: `${topic.subject}: ${topic.topic}`,
        updatedAt: topic.updatedAt.toISOString(),
      })),
    },
    upcomingReminders: reminders.map((item) => ({
      id: item.id,
      title: item.title,
      scheduledFor: item.scheduledFor.toISOString(),
      status: item.status,
    })),
  };
};
