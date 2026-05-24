import { prisma } from '../db.js';
import { env } from '../env.js';

export type AiProviderName = 'openai' | 'ollama';

export type AppSettings = {
  ai: {
    provider: AiProviderName;
    openaiModel: string;
    ollamaModel: string;
    ollamaBaseUrl: string;
  };
  telegram: {
    enabled: boolean;
    botToken: string | null;
    timezone: string;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
};

const CACHE_TTL_MS = 30_000;

const defaults: AppSettings = {
  ai: {
    provider: 'openai',
    openaiModel: env.OPENAI_MODEL,
    ollamaModel: env.OLLAMA_MODEL,
    ollamaBaseUrl: env.OLLAMA_BASE_URL,
  },
  telegram: {
    enabled: false,
    botToken: env.TELEGRAM_BOT_TOKEN_BOOT ?? null,
    timezone: 'UTC',
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00',
  },
};

let cache: { value: AppSettings; expiresAt: number } | null = null;

const parseValue = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const getStore = async (): Promise<Record<string, string>> => {
  const rows = await prisma.appSetting.findMany();
  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
};

export const buildSettingsFromStore = (store: Record<string, string>): AppSettings => ({
  ai: {
    provider: parseValue<AiProviderName>(store['ai.provider'] ?? JSON.stringify(defaults.ai.provider), defaults.ai.provider),
    openaiModel: parseValue<string>(store['ai.openai.model'] ?? JSON.stringify(defaults.ai.openaiModel), defaults.ai.openaiModel),
    ollamaModel: parseValue<string>(store['ai.ollama.model'] ?? JSON.stringify(defaults.ai.ollamaModel), defaults.ai.ollamaModel),
    ollamaBaseUrl: parseValue<string>(
      store['ai.ollama.baseUrl'] ?? JSON.stringify(defaults.ai.ollamaBaseUrl),
      defaults.ai.ollamaBaseUrl,
    ),
  },
  telegram: {
    enabled: parseValue<boolean>(store['telegram.enabled'] ?? JSON.stringify(defaults.telegram.enabled), defaults.telegram.enabled),
    botToken: parseValue<string | null>(
      store['telegram.botToken'] ?? JSON.stringify(defaults.telegram.botToken),
      defaults.telegram.botToken,
    ),
    timezone: parseValue<string>(store['telegram.timezone'] ?? JSON.stringify(defaults.telegram.timezone), defaults.telegram.timezone),
    quietHoursStart: parseValue<string>(
      store['telegram.quietHoursStart'] ?? JSON.stringify(defaults.telegram.quietHoursStart),
      defaults.telegram.quietHoursStart,
    ),
    quietHoursEnd: parseValue<string>(
      store['telegram.quietHoursEnd'] ?? JSON.stringify(defaults.telegram.quietHoursEnd),
      defaults.telegram.quietHoursEnd,
    ),
  },
});

export const getAppSettings = async (): Promise<AppSettings> => {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  const settings = buildSettingsFromStore(await getStore());
  cache = { value: settings, expiresAt: Date.now() + CACHE_TTL_MS };
  return settings;
};

export const updateAppSettings = async (
  values: Record<string, string | number | boolean | null>,
): Promise<AppSettings> => {
  const entries = Object.entries(values);
  if (entries.length === 0) return getAppSettings();
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      }),
    ),
  );
  cache = null;
  return getAppSettings();
};

export const invalidateSettingsCache = () => {
  cache = null;
};
