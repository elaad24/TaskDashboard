import type { DashboardLog, DashboardResponse, MissionBriefing } from '@command-center/shared';
import type { Task as PTask } from '@prisma/client';
import { prisma } from '../db.js';
import {
  serializeArea,
  serializeGoal,
  serializeDashboardLog,
  serializeProblem,
  serializeStudyTopic,
  serializeTask,
} from '../utils/serialize.js';
import { effectiveSpendEur } from './currencyService.js';

const DEFAULT_CURRENCY = 'EUR';
const RECENT_LOGS_LIMIT = 8;
const RECENT_LOGS_FETCH_POOL = 12;

type TaskWithArea = PTask & { area: { name: string } | null };

/** Synthetic feed entry for tasks that exist but never got a Log row. */
const syntheticTaskCreatedLog = (task: PTask, areaName: string | null): DashboardLog => {
  const serialized = serializeTask(task);
  const at = serialized.createdAt;
  return {
    id: `synthetic:task:${task.id}`,
    title: task.title,
    content: task.description,
    kind: 'task_created',
    areaId: task.areaId,
    trackId: task.trackId,
    goalId: task.goalId,
    taskId: task.id,
    problemId: task.problemId,
    studyTopicId: null,
    timeSpentMinutes: null,
    costAmount: null,
    costCurrency: null,
    costAmountEur: null,
    occurredAt: at,
    createdAt: at,
    taskTitle: task.title,
    task: serialized,
    areaName,
  };
};

const buildMergedRecentLogs = (
  logs: Parameters<typeof serializeDashboardLog>[0][],
  recentTasks: Array<TaskWithArea>,
): Array<DashboardLog> => {
  const loggedTaskIds = new Set(
    logs.map((l) => l.taskId).filter((id): id is string => id != null),
  );

  const synthetic = recentTasks
    .filter((t) => !loggedTaskIds.has(t.id))
    .map((t) => syntheticTaskCreatedLog(t, t.area?.name ?? null));

  return [...logs.map(serializeDashboardLog), ...synthetic]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, RECENT_LOGS_LIMIT);
};

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

type SpendRow = {
  areaId: string | null;
  costAmount: number | null;
  costAmountEur: number | null;
  costCurrency: string | null;
};

const sumSpendEur = (rows: Array<SpendRow>): number =>
  rows.reduce(
    (sum, row) =>
      sum + effectiveSpendEur(row.costAmount, row.costAmountEur, row.costCurrency),
    0,
  );

const fetchSpendRows = async (since: Date): Promise<Array<SpendRow>> =>
  prisma.log.findMany({
    where: { occurredAt: { gte: since }, costAmount: { not: null } },
    select: {
      areaId: true,
      costAmount: true,
      costAmountEur: true,
      costCurrency: true,
    },
  });

export const buildDashboard = async (): Promise<DashboardResponse> => {
  const [areas, openTasks, activeGoals, openProblems, recentLogs, studyTopics, recentTasks] =
    await Promise.all([
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
        take: RECENT_LOGS_FETCH_POOL,
        include: {
          task: true,
          area: { select: { name: true } },
        },
      }),
      prisma.studyTopic.findMany({
        orderBy: [{ confidence: 'asc' }, { lastStudiedAt: 'asc' }],
      }),
      prisma.task.findMany({
        orderBy: { createdAt: 'desc' },
        take: RECENT_LOGS_FETCH_POOL,
        include: { area: { select: { name: true } } },
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

  const [monthSpendRows, weekSpendRows] = await Promise.all([
    fetchSpendRows(startOfMonth()),
    fetchSpendRows(startOfWeek()),
  ]);
  const monthSpend = sumSpendEur(monthSpendRows);
  const weekSpend = sumSpendEur(weekSpendRows);

  const byAreaTotals = new Map<string | null, number>();
  for (const row of monthSpendRows) {
    byAreaTotals.set(
      row.areaId,
      (byAreaTotals.get(row.areaId) ?? 0) +
        effectiveSpendEur(row.costAmount, row.costAmountEur, row.costCurrency),
    );
  }
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
    recentLogs: buildMergedRecentLogs(recentLogs, recentTasks),
    budget: {
      monthSpend,
      weekSpend,
      currency: DEFAULT_CURRENCY,
      byArea: Array.from(byAreaTotals.entries()).map(([areaId, total]) => ({
        areaId,
        areaName: areaId ? (areaMap.get(areaId) ?? 'Other') : 'Other',
        total,
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
