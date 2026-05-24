import { logger } from './logger.js';
import { scanCalendar } from './integrations/google/calendarScanner.js';
import { scanGmail } from './integrations/google/gmailScanner.js';
import { isGoogleConnected } from './integrations/google/oauth.js';
import { dispatchDueReminders } from './services/notificationDispatcher.js';
import { getIntegrationSettings } from './services/integrationSettingsService.js';
import { materializeUpcoming } from './services/recurrenceService.js';
import { createEventForTask } from './integrations/google/calendarWriter.js';
import { prisma } from './db.js';

let intervalHandle: NodeJS.Timeout | null = null;
let tickCount = 0;
let lastGmailPollAt = 0;
let lastCalendarPollAt = 0;

export const startScheduler = () => {
  if (process.env.NODE_ENV === 'test' || intervalHandle) return;
  intervalHandle = setInterval(() => {
    tickCount += 1;
    void dispatchDueReminders();
    if (tickCount % 5 === 0) {
      void materializeUpcoming().then(() => void maybeAutoCreateCalendarEvents());
    }
    void maybePollIntegrations();
  }, 60_000);
  logger.info('scheduler started');
};

export const stopScheduler = () => {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
};

const maybePollIntegrations = async () => {
  if (!(await isGoogleConnected())) return;
  const settings = await getIntegrationSettings();
  const now = Date.now();

  if (now - lastGmailPollAt >= settings.gmailPollMinutes * 60_000) {
    lastGmailPollAt = now;
    try {
      await scanGmail();
    } catch (err) {
      logger.warn({ err }, 'scheduled gmail scan failed');
    }
  }

  if (now - lastCalendarPollAt >= settings.calendarPollMinutes * 60_000) {
    lastCalendarPollAt = now;
    try {
      await scanCalendar();
    } catch (err) {
      logger.warn({ err }, 'scheduled calendar scan failed');
    }
  }
};

const maybeAutoCreateCalendarEvents = async () => {
  if (!(await isGoogleConnected())) return;
  const recurrences = await prisma.taskRecurrence.findMany({
    where: { isActive: true, autoCreateCalendarEvent: true },
    include: { instances: { where: { dueDate: { gte: new Date() } }, take: 5 } },
  });
  for (const recurrence of recurrences) {
    for (const task of recurrence.instances) {
      try {
        await createEventForTask(task.id);
      } catch (err) {
        logger.debug({ err, taskId: task.id }, 'auto calendar event skipped');
      }
    }
  }
};
