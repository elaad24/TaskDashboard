import { HttpError } from '../../middleware/errorHandler.js';
import { logger } from '../../logger.js';
import type { AiProvider, ProviderPingResult, StructuredCallArgs } from '../provider.js';

type OllamaProviderConfig = {
  baseUrl: string;
  model: string;
};

type ChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

const postChat = async (config: OllamaProviderConfig, messages: Array<{ role: 'system' | 'user'; content: string }>) => {
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new HttpError(502, 'AI_REQUEST_FAILED', `Ollama request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as ChatResponse;
};

export const createOllamaProvider = (config: OllamaProviderConfig): AiProvider => {
  const chatJson = async <T>(args: StructuredCallArgs<T>): Promise<T> => {
    const start = Date.now();
    const systemInstruction = `${args.system}

Return ONLY valid JSON matching this schema:
${JSON.stringify(args.jsonSchema.schema)}`;

    const execute = async (user: string) =>
      postChat(config, [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: user },
      ]);

    const parseContent = (payload: ChatResponse): unknown => {
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new HttpError(502, 'AI_EMPTY_RESPONSE', 'Ollama returned no content');
      try {
        return JSON.parse(content);
      } catch {
        throw new HttpError(502, 'AI_INVALID_JSON', 'Ollama returned non-JSON content');
      }
    };

    try {
      const first = await execute(args.user);
      try {
        const parsed = args.parser(parseContent(first));
        logger.debug(
          {
            provider: 'ollama',
            model: config.model,
            label: args.label,
            ms: Date.now() - start,
            tokensIn: first.usage?.prompt_tokens,
            tokensOut: first.usage?.completion_tokens,
          },
          'navigator provider call',
        );
        return parsed;
      } catch (parseErr) {
        const retryPrompt = `${args.user}

Your previous output failed validation.
Return ONLY corrected JSON. Validation issue:
${parseErr instanceof Error ? parseErr.message : 'invalid format'}`;
        const second = await execute(retryPrompt);
        const parsed = args.parser(parseContent(second));
        logger.debug(
          {
            provider: 'ollama',
            model: config.model,
            label: args.label,
            retried: true,
            ms: Date.now() - start,
            tokensIn: second.usage?.prompt_tokens,
            tokensOut: second.usage?.completion_tokens,
          },
          'navigator provider call',
        );
        return parsed;
      }
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(
        502,
        'AI_REQUEST_FAILED',
        `Ollama request failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }
  };

  const ping = async (): Promise<ProviderPingResult> => {
    const startedAt = Date.now();
    try {
      const response = await fetch(`${config.baseUrl}/api/tags`);
      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          model: config.model,
          latencyMs: Date.now() - startedAt,
          error: `Ollama tags check failed (${response.status}): ${text}`,
        };
      }
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
    name: 'ollama',
    chatJson,
    ping,
  };
};
