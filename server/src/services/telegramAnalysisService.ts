import { z } from 'zod';
import { getProvider } from '../ai/index.js';
import { logger } from '../logger.js';
import { prisma } from '../db.js';
import { createLog } from './logService.js';
import { createTask } from './taskService.js';

const telegramClassificationSchema = z.object({
  kind: z.enum(['task', 'expense', 'unknown']),
  task: z
    .object({
      title: z.string().min(1).max(200),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    })
    .optional(),
  expense: z
    .object({
      title: z.string().min(1).max(200),
      amount: z.number().nonnegative(),
      currency: z.string().min(1).max(8).optional(),
    })
    .optional(),
});

type TelegramClassification = z.infer<typeof telegramClassificationSchema>;

export type TelegramAnalysisResult = {
  outcome: 'task_created' | 'expense_logged' | 'unknown' | 'error';
  reply: string;
};

const TELEGRAM_CLASSIFY_JSON_SCHEMA = {
  name: 'telegram_message_classification',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      kind: { type: 'string', enum: ['task', 'expense', 'unknown'] },
      task: {
        type: ['object', 'null'],
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          priority: { type: ['string', 'null'], enum: ['low', 'medium', 'high', 'critical', null] },
        },
        required: ['title', 'priority'],
      },
      expense: {
        type: ['object', 'null'],
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: ['string', 'null'] },
        },
        required: ['title', 'amount', 'currency'],
      },
    },
    required: ['kind', 'task', 'expense'],
  },
};

const TELEGRAM_CLASSIFY_SYSTEM = `You classify short Telegram messages for a personal productivity app.
Respond with JSON only.

Rules:
- "task" = anything to do, a reminder, a goal, or an action item
- "expense" = money that was spent or a purchase
- "unknown" = greetings, questions, or messages that are neither a task nor an expense
- Always assume task priority is "medium" unless clearly urgent
- Keep titles short and clear
- For expenses, extract amount and currency when possible; default currency to USD if missing`;

const classifyWithHeuristic = (text: string): TelegramClassification => {
  const expensePattern =
    /(?:spent|paid|bought|cost|expense|\$|€|£|₪)\s*[^\d]*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:usd|eur|ils|nis|\$|€|£|₪)/i;
  const match = text.match(expensePattern);
  if (match) {
    const amountRaw = match[1] ?? match[2] ?? '0';
    const amount = Number(amountRaw.replace(',', '.'));
    const currencyMatch = text.match(/(\$|€|£|₪|usd|eur|ils|nis)/i);
    const currency = currencyMatch?.[1]?.toUpperCase().replace('NIS', 'ILS') ?? 'USD';
    return {
      kind: 'expense',
      expense: {
        title: text.slice(0, 200),
        amount: Number.isFinite(amount) ? amount : 0,
        currency,
      },
    };
  }

  return {
    kind: 'task',
    task: {
      title: text.slice(0, 200),
      priority: 'medium',
    },
  };
};

const classifyMessage = async (text: string): Promise<TelegramClassification> => {
  try {
    const provider = await getProvider();
    const result = await provider.chatJson({
      system: TELEGRAM_CLASSIFY_SYSTEM,
      user: `Classify this message:\n${text}`,
      jsonSchema: TELEGRAM_CLASSIFY_JSON_SCHEMA,
      parser: (raw) => {
        const parsed = telegramClassificationSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error('Invalid classification payload');
        }
        return parsed.data;
      },
      label: 'telegram_classify',
    });
    return result;
  } catch (err) {
    logger.warn({ err }, 'telegram AI classification failed; using heuristic fallback');
    return classifyWithHeuristic(text);
  }
};

export const upsertInboxItem = async (messageId: number, chatId: string, sentAt: Date) => {
  return prisma.telegramInboxItem.upsert({
    where: {
      messageId_chatId: {
        messageId,
        chatId,
      },
    },
    create: {
      messageId,
      chatId,
      sentAt,
    },
    update: {},
  });
};

export const markAnalyzed = async (
  id: string,
  outcome: TelegramAnalysisResult['outcome'],
): Promise<void> => {
  await prisma.telegramInboxItem.update({
    where: { id },
    data: {
      analyzedAt: new Date(),
      outcome,
    },
  });
};

export const isPairedChat = async (chatId: string): Promise<boolean> => {
  const subscriber = await prisma.telegramSubscriber.findFirst({
    where: { chatId },
  });
  return Boolean(subscriber);
};

export const analyzeAndActOnMessage = async (text: string): Promise<TelegramAnalysisResult> => {
  try {
    const classification = await classifyMessage(text);

    if (classification.kind === 'task' && classification.task?.title) {
      await createTask({
        title: classification.task.title,
        priority: classification.task.priority ?? 'medium',
        source: 'ai',
        reason: 'Captured from Telegram',
      });
      return {
        outcome: 'task_created',
        reply: `Task added: ${classification.task.title}`,
      };
    }

    if (classification.kind === 'expense' && classification.expense?.title) {
      const amount = classification.expense.amount ?? 0;
      const currency = classification.expense.currency ?? 'USD';
      await createLog({
        title: classification.expense.title,
        kind: 'expense',
        costAmount: amount,
        costCurrency: currency,
      });
      const amountLabel = amount > 0 ? ` — ${currency} ${amount.toFixed(2)}` : '';
      return {
        outcome: 'expense_logged',
        reply: `Expense logged: ${classification.expense.title}${amountLabel}`,
      };
    }

    return {
      outcome: 'unknown',
      reply:
        "Got it, but I'm not sure what to do with this. Try: 'buy milk' or 'spent 20$ on lunch'.",
    };
  } catch (err) {
    logger.error({ err }, 'telegram message analysis failed');
    return {
      outcome: 'error',
      reply: 'Something went wrong while processing your message. Please try again.',
    };
  }
};
