import { ApiError } from '@/lib/api';

/** Whether TanStack Query should retry after this failure. */
export const shouldRetryQuery = (failureCount: number, err: unknown): boolean => {
  if (!(err instanceof ApiError)) {
    return failureCount < 1;
  }

  // Never auto-retry client/rate-limit errors — user action or cooldown is required.
  if (err.status === 429 || err.status === 408) return false;
  if (err.status >= 400 && err.status < 500) return false;

  // Gateway / upstream errors: at most one retry with backoff (see retryDelay).
  if (err.status >= 500) return failureCount < 1;

  return failureCount < 1;
};

/** Backoff between query retries (ms). */
export const queryRetryDelay = (attemptIndex: number, err: unknown): number => {
  if (err instanceof ApiError && err.status >= 500) {
    return Math.min(30_000, 5_000 * 2 ** attemptIndex);
  }
  return 1_000 * 2 ** attemptIndex;
};
