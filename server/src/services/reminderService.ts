import type { CreateReminderInput } from '@command-center/shared';
import { prisma } from '../db.js';

export const createReminder = async (input: CreateReminderInput) => {
  return prisma.reminder.create({
    data: {
      kind: input.kind,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      taskId: input.taskId ?? null,
      title: input.title,
      body: input.body ?? null,
      scheduledFor: new Date(input.scheduledFor),
      timezone: input.timezone ?? 'UTC',
      status: input.status ?? 'pending',
    },
  });
};

export const listUpcomingReminders = async (limit = 5) => {
  return prisma.reminder.findMany({
    where: { status: { in: ['pending', 'snoozed'] } },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });
};

export const dueReminders = async (now: Date) => {
  return prisma.reminder.findMany({
    where: {
      status: { in: ['pending', 'snoozed', 'failed'] },
      OR: [{ scheduledFor: { lte: now } }, { snoozedUntil: { lte: now } }],
    },
    orderBy: { scheduledFor: 'asc' },
    include: { task: true },
  });
};

export const markReminderSent = async (id: string) =>
  prisma.reminder.update({
    where: { id },
    data: { status: 'sent', sentAt: new Date(), lastError: null },
  });

export const markReminderFailed = async (id: string, error: string) =>
  prisma.reminder.update({
    where: { id },
    data: { status: 'failed', attempt: { increment: 1 }, lastError: error },
  });

export const cancelReminder = async (id: string) =>
  prisma.reminder.update({
    where: { id },
    data: { status: 'cancelled' },
  });

export const snoozeReminder = async (id: string, until: Date) =>
  prisma.reminder.update({
    where: { id },
    data: { status: 'snoozed', snoozedUntil: until },
  });
