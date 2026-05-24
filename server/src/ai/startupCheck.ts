import { logger } from '../logger.js';
import { getProvider } from './index.js';

/**
 * Verifies the configured OpenAI key once on server startup.
 * We send a tiny prompt and expect any short text response.
 */
export const verifyAiOnStartup = async (): Promise<void> => {
  const provider = await getProvider();
  const result = await provider.ping();
  if (result.ok) {
    logger.info(
      {
        provider: provider.name,
        model: result.model,
        ms: result.latencyMs,
      },
      'AI startup check passed',
    );
    return;
  }
  logger.error(
    {
      provider: provider.name,
      model: result.model,
      ms: result.latencyMs,
      error: result.error,
    },
    'AI startup check failed',
  );
};
