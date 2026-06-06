import type { Prisma } from '@prisma/client';
import type {
  CompleteTaskInput,
  CompleteTaskResponse,
  CreateTaskInput,
  TaskFilters,
  UpdateTaskInput,
} from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { serializeTask } from '../utils/serialize.js';
import { computePriorityScore, importanceToPriority } from '../utils/priority.js';
import { createReminder } from './reminderService.js';
import { materializeNextInstance } from './recurrenceService.js';
import { getIncompletePrerequisites } from './dependencyService.js';

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const buildWhere = (filters?: TaskFilters): Prisma.TaskWhereInput => {
  const where: Prisma.TaskWhereInput = {
    ...(filters?.hideRecurringTemplates === false ? {} : { isRecurringTemplate: false }),
  };
  if (!filters) return where;

  if (filters.areaId) where.areaId = filters.areaId;
  if (filters.trackId) where.trackId = filters.trackId;
  if (filters.goalId) where.goalId = filters.goalId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.source) where.source = filters.source;

  switch (filters.filter) {
    case 'today': {
      const now = new Date();
      where.dueDate = { gte: startOfDay(now), lte: endOfDay(now) };
      break;
    }
    case 'high_priority':
      where.priority = { in: ['high', 'critical'] };
      where.status = { not: 'done' };
      break;
    case 'no_deadline':
      where.dueDate = null;
      where.status = { not: 'done' };
      break;
    case 'blocked':
      where.status = 'blocked';
      break;
    case 'done':
      where.status = 'done';
      break;
    case 'open':
      where.status = { notIn: ['done', 'cancelled'] };
      break;
    case 'ai':
      where.source = 'ai';
      break;
    case 'manual':
      where.source = 'manual';
      break;
  }
  return where;
};

export const listTasks = async (filters?: TaskFilters) => {
  const tasks = await prisma.task.findMany({
    where: buildWhere(filters),
    orderBy: [
      { sortOrder: 'asc' },
      { status: 'asc' },
      { priorityScore: 'desc' },
      { createdAt: 'desc' },
    ],
  });
  return tasks.map(serializeTask);
};

export const getTask = async (id: string) => {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  return serializeTask(task);
};

const computeScoreForInput = (
  input: CreateTaskInput | UpdateTaskInput,
  fallback?: { importance?: number; urgency?: number; effort?: number },
): { importance: number; urgency: number; effort: number; score: number } => {
  const importance = input.importance ?? fallback?.importance ?? 3;
  const urgency = input.urgency ?? fallback?.urgency ?? 3;
  const effort = input.effort ?? fallback?.effort ?? 3;
  const score = computePriorityScore({
    importance,
    urgency,
    effort,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    hasGoal: Boolean(input.goalId),
    hasProblem: Boolean(input.problemId),
    status: input.status,
  });
  return { importance, urgency, effort, score };
};

export const createTask = async (input: CreateTaskInput) => {
  const { importance, urgency, effort, score } = computeScoreForInput(input);
  const priority = input.priority ?? importanceToPriority(importance);
  const maxOrder = await prisma.task.aggregate({ _max: { sortOrder: true } });
  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      priority,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      priorityScore: score,
      importance,
      urgency,
      effort,
      areaId: input.areaId ?? null,
      trackId: input.trackId ?? null,
      goalId: input.goalId ?? null,
      problemId: input.problemId ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      costAmount: input.costAmount ?? null,
      costCurrency: input.costCurrency ?? null,
      source: input.source ?? 'manual',
      reason: input.reason ?? null,
    },
  });
  await prisma.log.create({
    data: {
      title: task.title,
      content: task.description,
      kind: 'task_created',
      taskId: task.id,
      areaId: task.areaId,
      goalId: task.goalId,
      occurredAt: task.createdAt,
    },
  });

  if (task.dueDate) {
    const reminderAt = new Date(task.dueDate);
    reminderAt.setHours(reminderAt.getHours() - 1);
    await createReminder({
      kind: 'task_due',
      targetType: 'task',
      targetId: task.id,
      taskId: task.id,
      title: task.title,
      body: 'Task due soon',
      scheduledFor: reminderAt.toISOString(),
      timezone: 'UTC',
    });
  }
  return serializeTask(task);
};

export const createTasksBulk = async (inputs: Array<CreateTaskInput>) => {
  const results = [];
  for (const input of inputs) {
    results.push(await createTask(input));
  }
  return results;
};

export const updateTask = async (id: string, input: UpdateTaskInput) => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');

  const { importance, urgency, effort, score } = computeScoreForInput(input, existing);
  const priority = input.priority ?? existing.priority;

  const completedAtPatch: { completedAt?: Date | null } = {};
  if (input.status === 'done' && existing.status !== 'done') {
    completedAtPatch.completedAt = new Date();
  } else if (input.status && input.status !== 'done' && existing.status === 'done') {
    completedAtPatch.completedAt = null;
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.status !== undefined && { status: input.status }),
      priority,
      priorityScore: score,
      importance,
      urgency,
      effort,
      ...(input.areaId !== undefined && { areaId: input.areaId ?? null }),
      ...(input.trackId !== undefined && { trackId: input.trackId ?? null }),
      ...(input.goalId !== undefined && { goalId: input.goalId ?? null }),
      ...(input.problemId !== undefined && { problemId: input.problemId ?? null }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
      ...(input.estimatedMinutes !== undefined && { estimatedMinutes: input.estimatedMinutes ?? null }),
      ...(input.costAmount !== undefined && { costAmount: input.costAmount ?? null }),
      ...(input.costCurrency !== undefined && { costCurrency: input.costCurrency ?? null }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.reason !== undefined && { reason: input.reason ?? null }),
      ...completedAtPatch,
    },
  });
  return serializeTask(task);
};

export const deleteTask = async (id: string) => {
  await getTask(id);
  await prisma.task.delete({ where: { id } });
};

export const completeTask = async (id: string, input: CompleteTaskInput): Promise<CompleteTaskResponse> => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');

  const incompletePrereqs = await getIncompletePrerequisites(id);
  const warnings = incompletePrereqs.map((t) => `Prerequisite still open: ${t.title}`);

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id },
      data: {
        status: 'done',
        completedAt: new Date(),
        priorityScore: 0,
        ...(input.timeSpentMinutes !== undefined && { actualMinutes: input.timeSpentMinutes }),
        ...(input.costAmount !== undefined && {
          costAmount: input.costAmount,
          costCurrency: input.costCurrency ?? existing.costCurrency ?? 'EUR',
        }),
      },
    });

    // Always create a "completion" log so the dashboard "Recent Logs" shows it.
    const hasFollowUp =
      input.timeSpentMinutes !== undefined ||
      input.costAmount !== undefined ||
      (input.note !== undefined && input.note.trim().length > 0);

    const kind = input.costAmount !== undefined ? 'expense' : 'completion';

    await tx.log.create({
      data: {
        title: hasFollowUp ? task.title : `Completed: ${task.title}`,
        content: input.note ?? null,
        kind,
        areaId: task.areaId,
        trackId: task.trackId,
        goalId: task.goalId,
        taskId: task.id,
        timeSpentMinutes: input.timeSpentMinutes ?? null,
        costAmount: input.costAmount ?? null,
        costCurrency: input.costAmount !== undefined ? input.costCurrency ?? 'EUR' : null,
        occurredAt: new Date(),
      },
    });

    return task;
  });

  if (existing.recurrenceId) {
    await materializeNextInstance(existing.recurrenceId);
  }

  return {
    task: serializeTask(result),
    warnings,
  };
};

export const reorderTasks = async (orderedIds: Array<string>) => {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
};
