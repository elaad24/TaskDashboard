import type { FocusActivityType } from '@command-center/shared';

const STORAGE_KEY = 'cc:focus:activeSession';

export type ActiveFocusSession = {
  startedAt: string;
};

export const readActiveFocusSession = (): ActiveFocusSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveFocusSession;
    if (!parsed.startedAt || Number.isNaN(Date.parse(parsed.startedAt))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const writeActiveFocusSession = (session: ActiveFocusSession): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode errors
  }
};

export const clearActiveFocusSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

/** Re-anchor the timer after canceling the stop dialog so dialog time is excluded. */
export const resumeActiveFocusSession = (frozenSeconds: number): ActiveFocusSession => {
  const startedAt = new Date(Date.now() - frozenSeconds * 1000).toISOString();
  const session = { startedAt };
  writeActiveFocusSession(session);
  return session;
};

export const getElapsedSeconds = (startedAt: string): number => {
  const startMs = Date.parse(startedAt);
  if (Number.isNaN(startMs)) return 0;
  return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
};

export const formatElapsed = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const FOCUS_ACTIVITY_OPTIONS: Array<{ value: FocusActivityType; label: string }> = [
  { value: 'study', label: 'Study' },
  { value: 'work', label: 'Work' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'reading', label: 'Reading' },
  { value: 'chores', label: 'Chores' },
  { value: 'creative', label: 'Creative' },
  { value: 'other', label: 'Other' },
];
