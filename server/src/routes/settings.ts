import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  getAppSettings,
  invalidateSettingsCache,
  updateAppSettings,
  type AiProviderName,
} from '../services/appSettingsService.js';
import { env } from '../env.js';
import { createOpenAiProvider } from '../ai/providers/openaiProvider.js';
import { createOllamaProvider } from '../ai/providers/ollamaProvider.js';
import { prisma } from '../db.js';
import { telegramClient } from '../integrations/telegram/client.js';
import { HttpError } from '../middleware/errorHandler.js';

export const settingsRouter = Router();

const settingsPatchSchema = z.object({
  aiProvider: z.enum(['openai', 'ollama']).optional(),
  openaiModel: z.string().min(1).optional(),
  ollamaModel: z.string().min(1).optional(),
  ollamaBaseUrl: z.string().url().optional(),
  telegramEnabled: z.boolean().optional(),
  telegramBotToken: z.string().min(1).optional(),
  telegramTimezone: z.string().min(1).optional(),
  telegramQuietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  telegramQuietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const aiTestSchema = z.object({
  provider: z.enum(['openai', 'ollama']).optional(),
  openaiModel: z.string().min(1).optional(),
  ollamaModel: z.string().min(1).optional(),
  ollamaBaseUrl: z.string().url().optional(),
});

const redactSettings = (settings: Awaited<ReturnType<typeof getAppSettings>>) => ({
  ai: settings.ai,
  telegram: {
    enabled: settings.telegram.enabled,
    timezone: settings.telegram.timezone,
    quietHoursStart: settings.telegram.quietHoursStart,
    quietHoursEnd: settings.telegram.quietHoursEnd,
    hasBotToken: Boolean(settings.telegram.botToken),
  },
});

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await getAppSettings();
    res.json(redactSettings(settings));
  }),
);

settingsRouter.patch(
  '/',
  validate(settingsPatchSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof settingsPatchSchema>;
    const updates: Record<string, string | number | boolean | null> = {};
    if (input.aiProvider) updates['ai.provider'] = input.aiProvider;
    if (input.openaiModel) updates['ai.openai.model'] = input.openaiModel;
    if (input.ollamaModel) updates['ai.ollama.model'] = input.ollamaModel;
    if (input.ollamaBaseUrl) updates['ai.ollama.baseUrl'] = input.ollamaBaseUrl;
    if (input.telegramEnabled !== undefined) updates['telegram.enabled'] = input.telegramEnabled;
    if (input.telegramBotToken) updates['telegram.botToken'] = input.telegramBotToken;
    if (input.telegramTimezone) updates['telegram.timezone'] = input.telegramTimezone;
    if (input.telegramQuietHoursStart) updates['telegram.quietHoursStart'] = input.telegramQuietHoursStart;
    if (input.telegramQuietHoursEnd) updates['telegram.quietHoursEnd'] = input.telegramQuietHoursEnd;
    const settings = await updateAppSettings(updates);
    invalidateSettingsCache();
    res.json(redactSettings(settings));
  }),
);

settingsRouter.post(
  '/ai/test',
  asyncHandler(async (req, res) => {
    const input = aiTestSchema.parse(req.body ?? {});
    const settings = await getAppSettings();
    const providerName = (input.provider ?? settings.ai.provider) as AiProviderName;
    const provider =
      providerName === 'ollama'
        ? createOllamaProvider({
            model: input.ollamaModel ?? settings.ai.ollamaModel,
            baseUrl: input.ollamaBaseUrl ?? settings.ai.ollamaBaseUrl,
          })
        : createOpenAiProvider({
            apiKey: env.OPENAI_API_KEY ?? '',
            model: input.openaiModel ?? settings.ai.openaiModel,
          });
    const result = await provider.ping();
    res.json({ provider: provider.name, ...result });
  }),
);

settingsRouter.post(
  '/telegram/pair',
  asyncHandler(async (_req, res) => {
    const settings = await getAppSettings();
    const token = settings.telegram.botToken;
    if (!token) {
      throw new HttpError(400, 'TELEGRAM_TOKEN_MISSING', 'Telegram bot token is required');
    }
    const client = telegramClient(token);
    const me = await client.getMe();
    const pairingCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    const pairingExpiresAt = new Date(Date.now() + 15 * 60_000);

    await prisma.telegramSubscriber.create({
      data: {
        pairingCode,
        pairingExpiresAt,
      },
    });

    res.status(201).json({
      pairingCode,
      expiresAt: pairingExpiresAt.toISOString(),
      botUsername: me.username ?? null,
    });
  }),
);

settingsRouter.post(
  '/telegram/test',
  asyncHandler(async (_req, res) => {
    const settings = await getAppSettings();
    const token = settings.telegram.botToken;
    if (!token) {
      throw new HttpError(400, 'TELEGRAM_TOKEN_MISSING', 'Telegram bot token is required');
    }
    const subscriber = await prisma.telegramSubscriber.findFirst({
      where: { chatId: { not: null } },
      orderBy: { pairedAt: 'desc' },
    });
    if (!subscriber?.chatId) {
      throw new HttpError(400, 'TELEGRAM_NOT_PAIRED', 'Pair your Telegram first');
    }
    const client = telegramClient(token);
    await client.sendMessage({
      chatId: subscriber.chatId,
      text: '*Command Center test*\nTelegram connection is working.',
      parseMode: 'Markdown',
    });
    res.json({ ok: true });
  }),
);
