import { useCallback, useEffect, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import {
  clearActiveFocusSession,
  formatElapsed,
  getElapsedSeconds,
  readActiveFocusSession,
  resumeActiveFocusSession,
  writeActiveFocusSession,
  FOCUS_SESSION_STORAGE_KEY,
} from '@/lib/focusTimer';
import { StopSessionDialog } from '@/components/focus/StopSessionDialog';

export const FocusTimer = () => {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenEndedAt, setFrozenEndedAt] = useState<string | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);

  const syncFromStorage = useCallback(() => {
    const active = readActiveFocusSession();
    if (active) {
      setStartedAt(active.startedAt);
      setElapsedSeconds(getElapsedSeconds(active.startedAt));
    } else {
      setStartedAt(null);
      setElapsedSeconds(0);
    }
  }, []);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === FOCUS_SESSION_STORAGE_KEY) {
        syncFromStorage();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [syncFromStorage]);

  useEffect(() => {
    if (!startedAt || isFrozen) return;

    const tick = () => setElapsedSeconds(getElapsedSeconds(startedAt));
    tick();
    const id = window.setInterval(tick, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [startedAt, isFrozen]);

  const handleStart = () => {
    const now = new Date().toISOString();
    writeActiveFocusSession({ startedAt: now });
    setStartedAt(now);
    setElapsedSeconds(0);
    setIsFrozen(false);
    setFrozenEndedAt(null);
  };

  const handleStop = () => {
    if (!startedAt || elapsedSeconds < 1) {
      clearActiveFocusSession();
      setStartedAt(null);
      setElapsedSeconds(0);
      setIsFrozen(false);
      setFrozenEndedAt(null);
      return;
    }

    const endedAt = new Date().toISOString();
    setIsFrozen(true);
    setFrozenEndedAt(endedAt);
    setShowStopDialog(true);
  };

  const handleDialogClose = () => {
    if (isFrozen && elapsedSeconds > 0) {
      const resumed = resumeActiveFocusSession(elapsedSeconds);
      setStartedAt(resumed.startedAt);
      setElapsedSeconds(elapsedSeconds);
      setIsFrozen(false);
      setFrozenEndedAt(null);
    }
    setShowStopDialog(false);
  };

  const handleSaved = () => {
    setStartedAt(null);
    setElapsedSeconds(0);
    setIsFrozen(false);
    setFrozenEndedAt(null);
    setShowStopDialog(false);
  };

  const isRunning = Boolean(startedAt);

  return (
    <>
      <GlassCard className="flex flex-col items-center p-8" data-test-id="focus-timer-card">
        <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          {isFrozen ? 'Session paused' : isRunning ? 'Focus in progress' : 'Ready to focus'}
        </div>
        <div
          className="mt-4 font-mono text-6xl font-semibold tabular-nums tracking-tight text-text-main sm:text-7xl"
          data-test-id="focus-timer-display"
          aria-live="polite"
        >
          {formatElapsed(elapsedSeconds)}
        </div>
        <p className="mt-3 max-w-sm text-center text-sm text-text-soft">
          {isFrozen
            ? 'Timer frozen — complete the form to save, or cancel to resume.'
            : isRunning
              ? 'Timer keeps running when you switch tabs or refresh. Press stop when you get distracted.'
              : 'Press start when you begin an activity. The timer survives tab switches and page refresh.'}
        </p>

        <div className="mt-8">
          {isRunning && !isFrozen ? (
            <GlowButton
              size="lg"
              variant="danger"
              leftIcon={<Square size={18} />}
              onClick={handleStop}
              data-test-id="focus-timer-stop"
            >
              Stop
            </GlowButton>
          ) : !isRunning ? (
            <GlowButton
              size="lg"
              leftIcon={<Play size={18} />}
              onClick={handleStart}
              data-test-id="focus-timer-start"
            >
              Start
            </GlowButton>
          ) : null}
        </div>
      </GlassCard>

      {showStopDialog && startedAt && frozenEndedAt && (
        <StopSessionDialog
          startedAt={startedAt}
          endedAt={frozenEndedAt}
          durationSeconds={elapsedSeconds}
          onClose={handleDialogClose}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};
