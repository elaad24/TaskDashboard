import type { CreateRecurrenceInput, UpdateRecurrenceInput } from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { serializeTaskRecurrence } from '../utils/serialize.js';
import { createReminder } from './reminderService.js';

const parseTimeOfDay = (time: string): { hour: number; minute: number } => {
  const parts = time.split(':');
  const hour = Number(parts[0] ?? 0);
  const minute = Number(parts[1] ?? 0);
  return { hour, minute };
};

const atTime = (base: Date, timeOfDay: string): Date => {
  const date = new Date(base);
  const { hour, minute } = parseTimeOfDay(timeOfDay);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const addDays = (base: Date, days: number): Date => {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
};

const nextWeeklyDate = (from: Date, weekdays: Array<number>, timeOfDay: string): Date => {
  const current = atTime(from, timeOfDay);
  for (let i = 0; i < 8; i += 1) {
    const candidate = addDays(current, i);
    const weekday = candidate.getDay();
    if (weekdays.includes(weekday) && candidate > from) return candidate;
  }
  return addDays(current, 7);
};

const nextMonthlyDate = (from: Date, monthDay: number, timeOfDay: string): Date => {
  const candidate = atTime(from, timeOfDay);
  candidate.setDate(monthDay);
  if (candidate <= from) {
    candidate.setMonth(candidate.getMonth() + 1);
    candidate.setDate(monthDay);
  }
  return candidate;
};

export const calculateNextOccurrence = (args: {
  from: Date;
  frequency: string;
  intervalDays: number | null;
  weekdays: Array<number>;
  monthDay: number | null;
  timeOfDay: string;
}): Date => {
  switch (args.frequency) {
    case 'daily':
      return addDays(atTime(args.from, args.timeOfDay), 1);
    case 'interval':
      return addDays(atTime(args.from, args.timeOfDay), args.intervalDays ?? 1);
    case 'weekly':
      return nextWeeklyDate(args.from, args.weekdays, args.timeOfDay);
    case 'monthly':
      return nextMonthlyDate(args.from, args.monthDay ?? 1, args.timeOfDay);
    default:
      return addDays(atTime(args.from, args.timeOfDay), 1);
  }
};

const normalizeWeekdays = (weekdays: Array<number> | null | undefined): Array<number> =>
  Array.from(new Set((weekdays ?? []).filter((x) => x >= 0 && x <= 6)));

export const createRecurrence = async (taskId: string, input: CreateRecurrenceInput) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');

  const recurrence = await prisma.taskRecurrence.upsert({
    where: { taskId },
    create: {
      taskId,
      frequency: input.frequency,
      intervalDays: input.intervalDays ?? null,
      weekdays: JSON.stringify(normalizeWeekdays(input.weekdays)),
      monthDay: input.monthDay ?? null,
      timeOfDay: input.timeOfDay,
      timezone: input.timezone,
      startsOn: new Date(input.startsOn),
      endsOn: input.endsOn ? new Date(input.endsOn) : null,
      isActive: input.isActive ?? true,
      autoCreateCalendarEvent: input.autoCreateCalendarEvent ?? false,
    },
    update: {
      frequency: input.frequency,
      intervalDays: input.intervalDays ?? null,
      weekdays: JSON.stringify(normalizeWeekdays(input.weekdays)),
      monthDay: input.monthDay ?? null,
      timeOfDay: input.timeOfDay,
      timezone: input.timezone,
      startsOn: new Date(input.startsOn),
      endsOn: input.endsOn ? new Date(input.endsOn) : null,
      isActive: input.isActive ?? true,
      autoCreateCalendarEvent: input.autoCreateCalendarEvent ?? false,
    },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { isRecurringTemplate: true, recurrenceId: null },
  });
  return serializeTaskRecurrence(recurrence);
};

export const updateRecurrence = async (taskId: string, input: UpdateRecurrenceInput) => {
  const existing = await prisma.taskRecurrence.findUnique({ where: { taskId } });
  if (!existing) throw new HttpError(404, 'RECURRENCE_NOT_FOUND', 'Recurrence not found');
  const recurrence = await prisma.taskRecurrence.update({
    where: { taskId },
    data: {
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.intervalDays !== undefined && { intervalDays: input.intervalDays ?? null }),
      ...(input.weekdays !== undefined && { weekdays: JSON.stringify(normalizeWeekdays(input.weekdays)) }),
      ...(input.monthDay !== undefined && { monthDay: input.monthDay ?? null }),
      ...(input.timeOfDay !== undefined && { timeOfDay: input.timeOfDay }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.startsOn !== undefined && { startsOn: new Date(input.startsOn) }),
      ...(input.endsOn !== undefined && { endsOn: input.endsOn ? new Date(input.endsOn) : null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
  return serializeTaskRecurrence(recurrence);
};

export const cancelRecurrence = async (taskId: string) => {
  const existing = await prisma.taskRecurrence.findUnique({ where: { taskId } });
  if (!existing) throw new HttpError(404, 'RECURRENCE_NOT_FOUND', 'Recurrence not found');
  await prisma.taskRecurrence.update({
    where: { taskId },
    data: { isActive: false },
  });
};

const parseWeekdaysJson = (value: string | null): Array<number> => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is number => typeof item === 'number');
    }
  } catch {
    // ignore malformed value
  }
  return [];
};

export const materializeNextInstance = async (recurrenceId: string) => {
  const recurrence = await prisma.taskRecurrence.findUnique({
    where: { id: recurrenceId },
    include: { task: true },
  });
  if (!recurrence || !recurrence.isActive) return null;

  const from = recurrence.lastMaterializedAt ?? recurrence.startsOn;
  const nextDate = calculateNextOccurrence({
    from,
    frequency: recurrence.frequency,
    intervalDays: recurrence.intervalDays,
    weekdays: parseWeekdaysJson(recurrence.weekdays),
    monthDay: recurrence.monthDay,
    timeOfDay: recurrence.timeOfDay,
  });
  if (recurrence.endsOn && nextDate > recurrence.endsOn) return null;

  const exists = await prisma.task.findFirst({
    where: {
      recurrenceId: recurrence.id,
      dueDate: nextDate,
      status: { not: 'cancelled' },
    },
  });
  if (exists) return exists;

  const maxOrder = await prisma.task.aggregate({ _max: { sortOrder: true } });
  const instance = await prisma.task.create({
    data: {
      title: recurrence.task.title,
      description: recurrence.task.description,
      status: 'todo',
      priority: recurrence.task.priority,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      priorityScore: recurrence.task.priorityScore,
      importance: recurrence.task.importance,
      urgency: recurrence.task.urgency,
      effort: recurrence.task.effort,
      areaId: recurrence.task.areaId,
      trackId: recurrence.task.trackId,
      goalId: recurrence.task.goalId,
      problemId: recurrence.task.problemId,
      dueDate: nextDate,
      estimatedMinutes: recurrence.task.estimatedMinutes,
      costAmount: recurrence.task.costAmount,
      costCurrency: recurrence.task.costCurrency,
      source: recurrence.task.source,
      reason: recurrence.task.reason,
      recurrenceId: recurrence.id,
      isRecurringTemplate: false,
    },
  });

  await prisma.taskRecurrence.update({
    where: { id: recurrence.id },
    data: { lastMaterializedAt: nextDate },
  });

  if (instance.dueDate) {
    const reminderAt = new Date(instance.dueDate);
    reminderAt.setHours(reminderAt.getHours() - 1);
    await createReminder({
      kind: 'recurring',
      targetType: 'task',
      targetId: instance.id,
      taskId: instance.id,
      title: instance.title,
      body: 'Recurring task reminder',
      scheduledFor: reminderAt.toISOString(),
      timezone: recurrence.timezone,
    });
  }

  return instance;
};

export const materializeUpcoming = async (horizonDays = 7) => {
  const recurrences = await prisma.taskRecurrence.findMany({
    where: { isActive: true },
    include: { task: true },
  });
  const horizon = addDays(new Date(), horizonDays);

  for (const recurrence of recurrences) {
    const next = calculateNextOccurrence({
      from: recurrence.lastMaterializedAt ?? recurrence.startsOn,
      frequency: recurrence.frequency,
      intervalDays: recurrence.intervalDays,
      weekdays: parseWeekdaysJson(recurrence.weekdays),
      monthDay: recurrence.monthDay,
      timeOfDay: recurrence.timeOfDay,
    });
    if (next <= horizon) {
      await materializeNextInstance(recurrence.id);
    }
  }
};
