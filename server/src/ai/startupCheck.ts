import { logger } from '../logger.js';
import { env } from '../env.js';
import { getAppSettings } from '../services/appSettingsService.js';
import { createOpenAiProvider } from './providers/openaiProvider.js';
import { createOllamaProvider } from './providers/ollamaProvider.js';
import {
  getAiHealth,
  markOpenAiFailed,
  markOpenAiHealthy,
  refreshPreferredProvider,
  setEffectiveProvider,
  touchOpenAiCheck,
} from './health.js';

/**
 * Verifies AI connectivity on startup and picks the effective provider.
 * OpenAI is preferred when a key is configured; otherwise Ollama is used.
 * If OpenAI fails, we fall back to Ollama and mark the system degraded.
 */
export const verifyAiOnStartup = async (): Promise<void> => {
  const settings = await getAppSettings();

  if (settings.ai.provider === 'ollama') {
    const ollama = createOllamaProvider({
      baseUrl: settings.ai.ollamaBaseUrl,
      model: settings.ai.ollamaModel,
    });
    const result = await ollama.ping();
    if (result.ok) {
      setEffectiveProvider('ollama', { degraded: false, reason: null });
      logger.info(
        { provider: 'ollama', model: result.model, ms: result.latencyMs },
        'AI startup check passed (Ollama selected in settings)',
      );
      return;
    }
    logger.error(
      { provider: 'ollama', model: result.model, ms: result.latencyMs, error: result.error },
      'AI startup check failed — Ollama unavailable',
    );
    return;
  }

  refreshPreferredProvider();
  const health = getAiHealth();

  if (health.preferred === 'ollama') {
    const ollama = createOllamaProvider({
      baseUrl: settings.ai.ollamaBaseUrl,
      model: settings.ai.ollamaModel,
    });
    const result = await ollama.ping();
    if (result.ok) {
      setEffectiveProvider('ollama', { degraded: false, reason: null });
      logger.info(
        { provider: 'ollama', model: result.model, ms: result.latencyMs },
        'AI startup check passed (Ollama — no OpenAI key configured)',
      );
      return;
    }
    logger.error(
      { provider: 'ollama', model: result.model, ms: result.latencyMs, error: result.error },
      'AI startup check failed — Ollama unavailable',
    );
    return;
  }

  const openai = createOpenAiProvider({
    apiKey: env.OPENAI_API_KEY!,
    model: settings.ai.openaiModel,
  });
  touchOpenAiCheck();
  const openAiResult = await openai.ping();

  if (openAiResult.ok) {
    markOpenAiHealthy();
    logger.info(
      { provider: 'openai', model: openAiResult.model, ms: openAiResult.latencyMs },
      'AI startup check passed',
    );
    return;
  }

  logger.warn(
    {
      provider: 'openai',
      model: openAiResult.model,
      ms: openAiResult.latencyMs,
      error: openAiResult.error,
    },
    'OpenAI startup check failed — trying Ollama fallback',
  );

  const ollama = createOllamaProvider({
    baseUrl: settings.ai.ollamaBaseUrl,
    model: settings.ai.ollamaModel,
  });
  const ollamaResult = await ollama.ping();

  if (ollamaResult.ok) {
    markOpenAiFailed(openAiResult.error ?? 'OpenAI unavailable');
    logger.info(
      {
        provider: 'ollama',
        model: ollamaResult.model,
        ms: ollamaResult.latencyMs,
        fallbackFrom: 'openai',
      },
      'AI startup check passed via Ollama fallback',
    );
    return;
  }

  markOpenAiFailed(openAiResult.error ?? 'OpenAI unavailable');
  logger.error(
    {
      openaiError: openAiResult.error,
      ollamaError: ollamaResult.error,
    },
    'AI startup check failed — both OpenAI and Ollama unavailable',
  );
};

export const probeOpenAiRecovery = async (): Promise<boolean> => {
  if (!env.OPENAI_API_KEY?.trim()) return false;
  refreshPreferredProvider();
  const health = getAiHealth();
  if (health.preferred !== 'openai' || !health.degraded) return false;

  const settings = await getAppSettings();
  const openai = createOpenAiProvider({
    apiKey: env.OPENAI_API_KEY!,
    model: settings.ai.openaiModel,
  });
  touchOpenAiCheck();
  const result = await openai.ping();
  if (!result.ok) return false;

  markOpenAiHealthy();
  logger.info(
    { provider: 'openai', model: result.model, ms: result.latencyMs },
    'OpenAI recovered — switching back from Ollama fallback',
  );
  return true;
};
