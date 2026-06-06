import { env } from '../env.js';
import { getAppSettings } from '../services/appSettingsService.js';
import type { AiProvider } from './provider.js';
import { createOpenAiProvider } from './providers/openaiProvider.js';
import { createOllamaProvider } from './providers/ollamaProvider.js';
import { getAiHealth, markOpenAiFailed, refreshPreferredProvider, setEffectiveProvider } from './health.js';

export const getProviderByName = async (name: 'openai' | 'ollama'): Promise<AiProvider> => {
  const settings = await getAppSettings();
  if (name === 'ollama') {
    return createOllamaProvider({
      baseUrl: settings.ai.ollamaBaseUrl,
      model: settings.ai.ollamaModel,
    });
  }
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }
  return createOpenAiProvider({
    apiKey: env.OPENAI_API_KEY,
    model: settings.ai.openaiModel,
  });
};

export const getProvider = async (): Promise<AiProvider> => {
  const settings = await getAppSettings();

  if (settings.ai.provider === 'ollama') {
    setEffectiveProvider('ollama', { degraded: false, reason: null });
    return getProviderByName('ollama');
  }

  refreshPreferredProvider();
  const health = getAiHealth();

  if (health.preferred === 'openai' && !env.OPENAI_API_KEY) {
    markOpenAiFailed('OpenAI API key is not configured');
    return getProviderByName('ollama');
  }

  return getProviderByName(health.effective);
};
