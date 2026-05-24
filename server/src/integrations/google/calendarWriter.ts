import { prisma } from '../../db.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { getIntegrationSettings } from '../../services/integrationSettingsService.js';
import { getGoogleClients } from './oauth.js';
import { countCalendarWritesToday, markScanned } from './scanStore.js';

const CC_CREATED_TAG = '#cc_created';

const assertWriteCap = async (): Promise<void> => {
  const settings = await getIntegrationSettings();
  const used = await countCalendarWritesToday();
  if (used >= settings.calendarDailyWriteCap) {
    throw new HttpError(
      429,
      'CALENDAR_DAILY_CAP',
      `Daily calendar write cap reached (${settings.calendarDailyWriteCap}). Try again tomorrow.`,
    );
  }
};

const buildDescription = (localId: string, body?: string | null): string => {
  const suffix = `${CC_CREATED_TAG} cc_id=${localId}`;
  const base = body?.trim() ?? '';
  return base ? `${base}\n\n${suffix}` : suffix;
};

export const createEventForTask = async (taskId: string) => {
  await assertWriteCap();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new HttpError(404, 'NOT_FOUND', 'Task not found');
  if (!task.dueDate) {
    throw new HttpError(400, 'NO_DUE_DATE', 'Task needs a due date to add to calendar');
  }

  const existing = await prisma.integrationScan.findFirst({
    where: { externalId: `task:${taskId}`, kind: 'event_write' },
  });
  if (existing) {
    throw new HttpError(409, 'ALREADY_SYNCED', 'This task is already on your calendar');
  }

  const start = new Date(task.dueDate);
  const end = new Date(start.getTime() + 60 * 60_000);
  const { calendar } = await getGoogleClients();

  const created = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: `[cc] ${task.title}`,
      description: buildDescription(taskId, task.description),
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  const googleEventId = created.data.id;
  if (!googleEventId) throw new HttpError(502, 'CALENDAR_WRITE_FAILED', 'Google did not return event id');

  await markScanned({
    externalId: `task:${taskId}`,
    kind: 'event_write',
    etag: created.data.etag ?? null,
    outcome: googleEventId,
  });

  return { eventId: googleEventId, htmlLink: created.data.htmlLink ?? null };
};

export const createEventForReminder = async (reminderId: string) => {
  await assertWriteCap();
  const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
  if (!reminder) throw new HttpError(404, 'NOT_FOUND', 'Reminder not found');

  const existing = await prisma.integrationScan.findFirst({
    where: { externalId: `reminder:${reminderId}`, kind: 'event_write' },
  });
  if (existing) {
    throw new HttpError(409, 'ALREADY_SYNCED', 'This reminder is already on your calendar');
  }

  const start = new Date(reminder.scheduledFor);
  const end = new Date(start.getTime() + 30 * 60_000);
  const { calendar } = await getGoogleClients();

  const created = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: `[cc] ${reminder.title}`,
      description: buildDescription(reminderId, reminder.body),
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  const googleEventId = created.data.id;
  if (!googleEventId) throw new HttpError(502, 'CALENDAR_WRITE_FAILED', 'Google did not return event id');

  await markScanned({
    externalId: `reminder:${reminderId}`,
    kind: 'event_write',
    etag: created.data.etag ?? null,
    outcome: googleEventId,
  });

  return { eventId: googleEventId, htmlLink: created.data.htmlLink ?? null };
};

export const getCalendarWriteStatus = async () => {
  const settings = await getIntegrationSettings();
  const used = await countCalendarWritesToday();
  return { used, cap: settings.calendarDailyWriteCap, remaining: Math.max(0, settings.calendarDailyWriteCap - used) };
};
