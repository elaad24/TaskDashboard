import type { DashboardResponse, MissionBriefing } from '@command-center/shared';
import { prisma } from '../db.js';
import {
  serializeArea,
  serializeGoal,
  serializeLog,
  serializeProblem,
  serializeStudyTopic,
  serializeTask,
} from '../utils/serialize.js';

const DEFAULT_CURRENCY = 'EUR';

const startOfWeek = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};
const startOfMonth = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
};

export const buildDashboard = async (): Promise<DashboardResponse> => {
  const [areas, openTasks, activeGoals, openProblems, recentLogs, studyTopics] = await Promise.all([
    prisma.area.findMany({ orderBy: { order: 'asc' } }),
    prisma.task.findMany({
      where: { status: { notIn: ['done', 'cancelled'] } },
      orderBy: [{ sortOrder: 'asc' }, { priorityScore: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    }),
    prisma.goal.findMany({
      where: { status: 'active' },
      orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }, { progress: 'desc' }],
      take: 5,
    }),
    prisma.problem.findMany({
      where: { status: { in: ['open', 'planning'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    prisma.log.findMany({
      orderBy: { occurredAt: 'desc' },
      take: 8,
    }),
    prisma.studyTopic.findMany({
      orderBy: [{ confidence: 'asc' }, { lastStudiedAt: 'asc' }],
    }),
  ]);

  const tracksWithCounts = await Promise.all(
    areas.map(async (area) => {
      const [openTaskCount, blockedCount, nextTask] = await Promise.all([
        prisma.task.count({
          where: { areaId: area.id, status: { notIn: ['done', 'cancelled'] } },
        }),
        prisma.task.count({ where: { areaId: area.id, status: 'blocked' } }),
        prisma.task.findFirst({
          where: { areaId: area.id, status: { notIn: ['done', 'cancelled'] } },
          orderBy: [{ priorityScore: 'desc' }],
          select: { title: true },
        }),
      ]);
      return {
        ...serializeArea(area),
        openTaskCount,
        blockedCount,
        nextAction: nextTask?.title ?? null,
      };
    }),
  );

  const monthSpendAgg = await prisma.log.aggregate({
    where: { occurredAt: { gte: startOfMonth() }, costAmount: { not: null } },
    _sum: { costAmount: true },
  });
  const weekSpendAgg = await prisma.log.aggregate({
    where: { occurredAt: { gte: startOfWeek() }, costAmount: { not: null } },
    _sum: { costAmount: true },
  });
  const byAreaSpend = await prisma.log.groupBy({
    by: ['areaId'],
    where: { occurredAt: { gte: startOfMonth() }, costAmount: { not: null } },
    _sum: { costAmount: true },
  });
  const areaMap = new Map(areas.map((a) => [a.id, a.name]));

  // Mission briefing: pick the highest-priority open task linked to a goal
  // or a problem; if none, fall back to the highest-priorityScore task.
  const briefingTask =
    openTasks.find((t) => t.problemId !== null) ??
    openTasks.find((t) => t.goalId !== null) ??
    openTasks[0] ??
    null;

  let briefing: MissionBriefing | null = null;
  if (briefingTask) {
    briefing = {
      mainFocus: briefingTask.title,
      why:
        briefingTask.reason ??
        (briefingTask.goalId
          ? 'Directly supports an active goal you are pushing this week.'
          : 'Highest-impact open action right now.'),
      recommendedMinutes: briefingTask.estimatedMinutes ?? 45,
      primaryAction: briefingTask.title,
      navigatorMessage: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const allMockScores = studyTopics
    .map((s) => s.mockScore)
    .filter((s): s is number => typeof s === 'number');
  const avgMock =
    allMockScores.length > 0
      ? Math.round(allMockScores.reduce((a, b) => a + b, 0) / allMockScores.length)
      : null;

  const studyMinutesThisWeekAgg = await prisma.log.aggregate({
    where: { kind: 'study', occurredAt: { gte: startOfWeek() } },
    _sum: { timeSpentMinutes: true },
  });

  const allWeak = new Set<string>();
  for (const t of studyTopics) {
    try {
      const arr = JSON.parse(t.weakTopics);
      if (Array.isArray(arr)) for (const w of arr) if (typeof w === 'string') allWeak.add(w);
    } catch {
      // ignore
    }
  }

  return {
    briefing,
    nextActions: openTasks.slice(0, 5).map(serializeTask),
    activeGoals: activeGoals.map(serializeGoal),
    tracks: tracksWithCounts,
    problems: openProblems.map(serializeProblem),
    recentLogs: recentLogs.map(serializeLog),
    budget: {
      monthSpend: monthSpendAgg._sum.costAmount ?? 0,
      weekSpend: weekSpendAgg._sum.costAmount ?? 0,
      currency: DEFAULT_CURRENCY,
      byArea: byAreaSpend.map((row) => ({
        areaId: row.areaId,
        areaName: row.areaId ? areaMap.get(row.areaId) ?? 'Other' : 'Other',
        total: row._sum.costAmount ?? 0,
      })),
    },
    study: {
      topicCount: studyTopics.length,
      weakTopics: Array.from(allWeak),
      averageMockScore: avgMock,
      minutesThisWeek: studyMinutesThisWeekAgg._sum.timeSpentMinutes ?? 0,
    },
    weakStudyTopics: studyTopics
      .filter((s) => s.confidence !== 'high')
      .slice(0, 5)
      .map(serializeStudyTopic),
  };
};
