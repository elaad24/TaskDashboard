import { env } from '../env.js';
import { getAppSettings } from '../services/appSettingsService.js';
import type { AiProvider } from './provider.js';
import { createOpenAiProvider } from './providers/openaiProvider.js';
import { createOllamaProvider } from './providers/ollamaProvider.js';

export const getProvider = async (): Promise<AiProvider> => {
  const settings = await getAppSettings();
  if (settings.ai.provider === 'ollama') {
    return createOllamaProvider({
      baseUrl: settings.ai.ollamaBaseUrl,
      model: settings.ai.ollamaModel,
    });
  }
  return createOpenAiProvider({
    apiKey: env.OPENAI_API_KEY,
    model: settings.ai.openaiModel,
  });
};
