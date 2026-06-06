import { env } from '../env.js';
import type { AiProviderName } from '../services/appSettingsService.js';

export type AiHealthState = {
  preferred: AiProviderName;
  effective: AiProviderName;
  degraded: boolean;
  reason: string | null;
  since: string | null;
  lastOpenAiCheckAt: number | null;
};

const OPENAI_RECOVERY_COOLDOWN_MS = 5 * 60_000;

const isUsableOpenAiKey = (key: string | undefined): boolean => {
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed.startsWith('sk-')) return false;
  if (trimmed === 'sk-...' || trimmed === 'sk-') return false;
  return trimmed.length > 10;
};

const resolvePreferred = (): AiProviderName =>
  isUsableOpenAiKey(env.OPENAI_API_KEY) ? 'openai' : 'ollama';

let state: AiHealthState = {
  preferred: resolvePreferred(),
  effective: resolvePreferred(),
  degraded: false,
  reason: null,
  since: null,
  lastOpenAiCheckAt: null,
};

export const getAiHealth = (): AiHealthState => ({ ...state });

export const refreshPreferredProvider = (): void => {
  const preferred = resolvePreferred();
  state = { ...state, preferred };
  if (preferred === 'ollama' && state.effective === 'openai') {
    state = {
      ...state,
      effective: 'ollama',
      degraded: true,
      reason: state.reason ?? 'OpenAI API key is not configured',
      since: state.since ?? new Date().toISOString(),
    };
  }
};

export const setEffectiveProvider = (
  effective: AiProviderName,
  options: { degraded?: boolean; reason?: string | null } = {},
): void => {
  const degraded = options.degraded ?? false;
  const reason = degraded ? (options.reason ?? state.reason) : null;
  state = {
    ...state,
    effective,
    degraded,
    reason,
    since: degraded ? (state.since ?? new Date().toISOString()) : null,
  };
};

export const markOpenAiFailed = (reason: string): void => {
  if (state.preferred !== 'openai') return;
  state = {
    ...state,
    effective: 'ollama',
    degraded: true,
    reason,
    since: state.since ?? new Date().toISOString(),
    lastOpenAiCheckAt: Date.now(),
  };
};

export const markOpenAiHealthy = (): void => {
  if (state.preferred !== 'openai') return;
  state = {
    ...state,
    effective: 'openai',
    degraded: false,
    reason: null,
    since: null,
    lastOpenAiCheckAt: Date.now(),
  };
};

export const touchOpenAiCheck = (): void => {
  state = { ...state, lastOpenAiCheckAt: Date.now() };
};

export const shouldRecheckOpenai = (cooldownMs = OPENAI_RECOVERY_COOLDOWN_MS): boolean => {
  if (state.preferred !== 'openai' || !state.degraded) return false;
  if (state.lastOpenAiCheckAt === null) return true;
  return Date.now() - state.lastOpenAiCheckAt >= cooldownMs;
};

export const isOpenAiFailureError = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('429') ||
    message.includes('incorrect api key') ||
    message.includes('invalid api key') ||
    message.includes('authentication') ||
    message.includes('quota') ||
    message.includes('billing') ||
    message.includes('openai request failed')
  );
};
