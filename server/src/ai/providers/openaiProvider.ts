import OpenAI from 'openai';
import { HttpError } from '../../middleware/errorHandler.js';
import { logger } from '../../logger.js';
import type { AiProvider, StructuredCallArgs, ProviderPingResult } from '../provider.js';

type OpenAiProviderConfig = {
  apiKey: string;
  model: string;
};

export const createOpenAiProvider = (config: OpenAiProviderConfig): AiProvider => {
  const client = new OpenAI({ apiKey: config.apiKey });

  const chatJson = async <T>(args: StructuredCallArgs<T>): Promise<T> => {
    const start = Date.now();
    try {
      const res = await client.chat.completions.create({
        model: config.model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: args.system },
          { role: 'user', content: args.user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: args.jsonSchema as never,
        },
      });
      const content = res.choices[0]?.message?.content;
      if (!content) throw new HttpError(502, 'AI_EMPTY_RESPONSE', 'AI returned no content');
      let raw: unknown;
      try {
        raw = JSON.parse(content);
      } catch {
        throw new HttpError(502, 'AI_INVALID_JSON', 'AI returned non-JSON content');
      }
      const parsed = args.parser(raw);
      logger.debug(
        {
          provider: 'openai',
          model: config.model,
          label: args.label,
          ms: Date.now() - start,
          tokensIn: res.usage?.prompt_tokens,
          tokensOut: res.usage?.completion_tokens,
        },
        'navigator provider call',
      );
      return parsed;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(
        502,
        'AI_REQUEST_FAILED',
        `OpenAI request failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }
  };

  const ping = async (): Promise<ProviderPingResult> => {
    const startedAt = Date.now();
    try {
      await client.chat.completions.create({
        model: config.model,
        temperature: 0,
        max_tokens: 5,
        messages: [
          { role: 'system', content: 'You are a health check endpoint. Reply with exactly: OK' },
          { role: 'user', content: 'ping' },
        ],
      });
      return { ok: true, model: config.model, latencyMs: Date.now() - startedAt };
    } catch (err) {
      return {
        ok: false,
        model: config.model,
        latencyMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : 'unknown error',
      };
    }
  };

  return {
    name: 'openai',
    chatJson,
    ping,
  };
};
