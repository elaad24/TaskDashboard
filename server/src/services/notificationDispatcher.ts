import { logger } from '../logger.js';
import { telegramClient } from '../integrations/telegram/client.js';
import { dueReminders, markReminderFailed, markReminderSent } from './reminderService.js';
import { getAppSettings } from './appSettingsService.js';
import { prisma } from '../db.js';

export const isInQuietHours = (start: string, end: string, now: Date): boolean => {
  const startParts = start.split(':').map(Number);
  const endParts = end.split(':').map(Number);
  const startH = startParts[0] ?? 0;
  const startM = startParts[1] ?? 0;
  const endH = endParts[0] ?? 0;
  const endM = endParts[1] ?? 0;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

export const dispatchDueReminders = async () => {
  const settings = await getAppSettings();
  if (!settings.telegram.enabled || !settings.telegram.botToken) return;

  const now = new Date();
  if (isInQuietHours(settings.telegram.quietHoursStart, settings.telegram.quietHoursEnd, now)) {
    return;
  }

  const subscriber = await prisma.telegramSubscriber.findFirst({
    where: { chatId: { not: null } },
    orderBy: { pairedAt: 'desc' },
  });
  if (!subscriber?.chatId) return;

  const reminders = await dueReminders(now);
  if (reminders.length === 0) return;

  const client = telegramClient(settings.telegram.botToken);
  for (const reminder of reminders) {
    try {
      await client.sendMessage({
        chatId: subscriber.chatId,
        parseMode: 'Markdown',
        text: `*${reminder.title}*\n${reminder.body ?? 'Reminder from Command Center.'}`,
        inlineKeyboard: reminder.taskId
          ? [
              [
                { text: 'Done', callback_data: `done:${reminder.taskId}` },
                { text: 'Snooze 1h', callback_data: `snooze:${reminder.id}:60` },
                { text: 'Snooze 1d', callback_data: `snooze:${reminder.id}:1440` },
                { text: 'Open', url: `http://localhost:5173/tasks?focus=${reminder.taskId}` },
              ],
            ]
          : undefined,
      });
      await markReminderSent(reminder.id);
    } catch (err) {
      await markReminderFailed(reminder.id, err instanceof Error ? err.message : 'unknown telegram error');
      logger.error({ err, reminderId: reminder.id }, 'failed to dispatch reminder');
    }
  }
};
