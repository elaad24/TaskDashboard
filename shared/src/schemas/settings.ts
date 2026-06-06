import { z } from 'zod';

export const aiProviderSchema = z.enum(['openai', 'ollama']);

export const settingsStatusSchema = z.object({
  openai: z.object({ configured: z.boolean(), model: z.string() }),
  ai: z.object({ provider: aiProviderSchema }),
  aiHealth: z.object({
    preferred: aiProviderSchema,
    effective: aiProviderSchema,
    degraded: z.boolean(),
    reason: z.string().nullable(),
  }),
  env: z.string(),
});
export type SettingsStatus = z.infer<typeof settingsStatusSchema>;

export const settingsSchema = z.object({
  ai: z.object({
    provider: aiProviderSchema,
    openaiModel: z.string(),
    ollamaModel: z.string(),
    ollamaBaseUrl: z.string(),
  }),
  telegram: z.object({
    enabled: z.boolean(),
    timezone: z.string(),
    quietHoursStart: z.string(),
    quietHoursEnd: z.string(),
    hasBotToken: z.boolean(),
  }),
});
export type Settings = z.infer<typeof settingsSchema>;

export const settingsPatchInputSchema = z.object({
  aiProvider: aiProviderSchema.optional(),
  openaiModel: z.string().min(1).optional(),
  ollamaModel: z.string().min(1).optional(),
  ollamaBaseUrl: z.string().url().optional(),
  telegramEnabled: z.boolean().optional(),
  telegramBotToken: z.string().min(1).optional(),
  telegramTimezone: z.string().min(1).optional(),
  telegramQuietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  telegramQuietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});
export type SettingsPatchInput = z.infer<typeof settingsPatchInputSchema>;
