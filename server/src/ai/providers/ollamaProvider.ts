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

/**
 * Strip markdown code fences that some local models add even when told not to.
 * e.g. ```json\n{...}\n``` -> {...}
 */
const stripMarkdownFences = (raw: string): string => {
  const trimmed = raw.trim();
  const fenceMatch = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/.exec(trimmed);
  return fenceMatch?.[1]?.trim() ?? trimmed;
};

/**
 * Extract a human-readable list of required fields from a JSON schema.
 * Used to build a more actionable retry prompt.
 */
const extractRequiredFields = (schema: Record<string, unknown>): Array<string> => {
  const required = (schema.required as Array<string> | undefined) ?? [];
  return required;
};

const postChat = async (
  config: OllamaProviderConfig,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  jsonSchema: { name: string; schema: Record<string, unknown> },
) => {
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: jsonSchema.name,
          strict: true,
          schema: jsonSchema.schema,
        },
      },
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
    const requiredFields = extractRequiredFields(args.jsonSchema.schema);

    const systemInstruction = `${args.system}

You MUST return ONLY valid JSON. Do not include any text, explanation, or markdown outside the JSON object.
The JSON must contain these required top-level fields: ${requiredFields.join(', ')}.

Schema:
${JSON.stringify(args.jsonSchema.schema, null, 2)}`;

    const parseContent = (payload: ChatResponse): unknown => {
      const raw = payload.choices?.[0]?.message?.content;
      if (!raw) throw new HttpError(502, 'AI_EMPTY_RESPONSE', 'Ollama returned no content');
      const cleaned = stripMarkdownFences(raw);
      try {
        return JSON.parse(cleaned);
      } catch {
        throw new HttpError(502, 'AI_INVALID_JSON', `Ollama returned non-JSON content: ${cleaned.slice(0, 200)}`);
      }
    };

    const execute = async (user: string) =>
      postChat(
        config,
        [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: user },
        ],
        args.jsonSchema,
      );

    try {
      const first = await execute(args.user);
      const firstParsed = parseContent(first);

      try {
        const result = args.parser(firstParsed);
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
        return result;
      } catch (parseErr) {
        const zodMessage = parseErr instanceof Error ? parseErr.message : 'invalid format';
        logger.warn(
          { provider: 'ollama', model: config.model, label: args.label, zodMessage },
          'Ollama response failed schema validation — retrying with explicit correction prompt',
        );

        const retryPrompt = `${args.user}

IMPORTANT: Your previous response was rejected because it was missing required fields or had wrong types.

Required top-level fields (all must be present): ${requiredFields.join(', ')}

Specific validation error:
${zodMessage}

Return ONLY the corrected JSON object. No markdown, no explanation.`;

        const second = await execute(retryPrompt);
        const secondParsed = parseContent(second);
        const result = args.parser(secondParsed);

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
        return result;
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
