import { logger } from '../../logger.js';
import { telegramClient } from './client.js';
import { getAppSettings } from '../../services/appSettingsService.js';
import { prisma } from '../../db.js';
import { completeTask } from '../../services/taskService.js';
import { snoozeReminder } from '../../services/reminderService.js';
import {
  analyzeAndActOnMessage,
  isPairedChat,
  markAnalyzed,
  upsertInboxItem,
} from '../../services/telegramAnalysisService.js';

let running = false;
let stopRequested = false;

const handleMessage = async (
  botToken: string,
  message: {
    message_id: number;
    date?: number;
    text?: string;
    chat: { id: number };
    from?: { username?: string };
  },
) => {
  const text = message.text?.trim();
  if (!text) return;
  const client = telegramClient(botToken);
  const chatId = String(message.chat.id);

  if (text.startsWith('/start')) {
    const pairingCode = text.split(/\s+/)[1];
    if (!pairingCode) {
      await client.sendMessage({ chatId, text: 'Send /start <pairing-code> from Settings.' });
      return;
    }
    const subscriber = await prisma.telegramSubscriber.findFirst({
      where: {
        pairingCode,
        pairingExpiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscriber) {
      await client.sendMessage({ chatId, text: 'Pairing code is invalid or expired.' });
      return;
    }
    await prisma.telegramSubscriber.update({
      where: { id: subscriber.id },
      data: {
        chatId,
        username: message.from?.username ?? null,
        pairedAt: new Date(),
        pairingCode: null,
        pairingExpiresAt: null,
      },
    });
    await client.sendMessage({ chatId, text: 'Command Center connected successfully.' });
    return;
  }

  if (text === '/today') {
    const openCount = await prisma.task.count({
      where: { status: { notIn: ['done', 'cancelled'] }, isRecurringTemplate: false },
    });
    const dueTodayCount = await prisma.task.count({
      where: {
        status: { notIn: ['done', 'cancelled'] },
        isRecurringTemplate: false,
        dueDate: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
      },
    });
    await client.sendMessage({
      chatId,
      text: `Today snapshot:\nOpen tasks: ${openCount}\nDue today/overdue: ${dueTodayCount}`,
    });
    return;
  }

  if (text === '/next') {
    const nextTask = await prisma.task.findFirst({
      where: { status: { notIn: ['done', 'cancelled'] }, isRecurringTemplate: false },
      orderBy: [{ priorityScore: 'desc' }, { dueDate: 'asc' }],
    });
    await client.sendMessage({
      chatId,
      text: nextTask ? `Next action: ${nextTask.title}` : 'No open tasks right now.',
    });
    return;
  }

  if (text === '/help') {
    await client.sendMessage({
      chatId,
      text: 'Commands: /today, /next, /help. Send any plain text to capture a task or expense.',
    });
    return;
  }

  const paired = await isPairedChat(chatId);
  if (!paired) {
    await client.sendMessage({
      chatId,
      text: 'This chat is not paired yet. Generate a pairing code in Settings and send /start <code>.',
    });
    return;
  }

  const sentAt = message.date ? new Date(message.date * 1000) : new Date();
  const item = await upsertInboxItem(message.message_id, chatId, sentAt);
  if (item.analyzedAt) return;

  const result = await analyzeAndActOnMessage(text);
  await markAnalyzed(item.id, result.outcome);
  await client.sendMessage({ chatId, text: result.reply });
};

const handleCallback = async (
  botToken: string,
  callback: { id: string; data?: string; message?: { chat: { id: number } } },
) => {
  const data = callback.data ?? '';
  const client = telegramClient(botToken);
  const chatId = String(callback.message?.chat.id ?? '');
  const [kind, first, second] = data.split(':');

  if (kind === 'done' && first) {
    await completeTask(first, {});
    await client.answerCallbackQuery({ callbackQueryId: callback.id, text: 'Marked done' });
    if (chatId) await client.sendMessage({ chatId, text: 'Task marked as done.' });
    return;
  }
  if (kind === 'snooze' && first && second) {
    const minutes = Number(second);
    if (!Number.isNaN(minutes) && minutes > 0) {
      await snoozeReminder(first, new Date(Date.now() + minutes * 60 * 1000));
      await client.answerCallbackQuery({ callbackQueryId: callback.id, text: `Snoozed ${minutes}m` });
      return;
    }
  }
  await client.answerCallbackQuery({ callbackQueryId: callback.id });
};

export const startTelegramWorker = async (): Promise<void> => {
  if (running) return;
  const settings = await getAppSettings();
  if (!settings.telegram.enabled || !settings.telegram.botToken) return;
  running = true;
  stopRequested = false;
  const client = telegramClient(settings.telegram.botToken);
  let offset = 0;

  const loop = async () => {
    while (!stopRequested) {
      try {
        const updates = await client.getUpdates({ offset, timeout: 30 });
        for (const update of updates) {
          offset = update.update_id + 1;
          if (update.message) {
            await handleMessage(settings.telegram.botToken as string, update.message);
          }
          if (update.callback_query) {
            await handleCallback(settings.telegram.botToken as string, update.callback_query);
          }
        }
      } catch (err) {
        logger.error({ err }, 'telegram worker loop error');
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
    running = false;
  };

  void loop();
  logger.info('telegram worker started');
};

export const stopTelegramWorker = async (): Promise<void> => {
  stopRequested = true;
};
