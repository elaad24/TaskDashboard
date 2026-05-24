import { useState } from 'react';
import { Calendar, Mail, Clock3, X, AlarmClock } from 'lucide-react';
import type { PendingCapture } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { usePendingCaptureActions, usePendingCaptures } from '@/hooks/usePendingCaptures';

const CaptureCard = ({ capture }: { capture: PendingCapture }) => {
  const toast = useToast();
  const actions = usePendingCaptureActions();
  const [costAmount, setCostAmount] = useState('');
  const [timeSpentMinutes, setTimeSpentMinutes] = useState('');
  const [location, setLocation] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [note, setNote] = useState('');
  const [createTask, setCreateTask] = useState(false);

  const handleSave = async () => {
    try {
      await actions.answer.mutateAsync({
        id: capture.id,
        input: {
          costAmount: costAmount ? Number(costAmount) : undefined,
          costCurrency: 'EUR',
          timeSpentMinutes: timeSpentMinutes ? Number(timeSpentMinutes) : undefined,
          location: location.trim() || undefined,
          counterparty: counterparty.trim() || undefined,
          note: note.trim() || undefined,
          createTask,
        },
      });
      toast.showSuccess('Saved to logs');
    } catch (error) {
      toast.showError('Save failed', error instanceof Error ? error.message : undefined);
    }
  };

  const handleDismiss = async () => {
    try {
      await actions.dismiss.mutateAsync(capture.id);
    } catch (error) {
      toast.showError('Dismiss failed', error instanceof Error ? error.message : undefined);
    }
  };

  const handleSnooze = async () => {
    try {
      await actions.snooze.mutateAsync(capture.id);
      toast.showSuccess('Snoozed for 1 day');
    } catch (error) {
      toast.showError('Snooze failed', error instanceof Error ? error.message : undefined);
    }
  };

  const SourceIcon = capture.source === 'calendar' ? Calendar : Mail;

  return (
    <GlassCard variant="cyan" className="p-4" data-test-id={`pending-capture-${capture.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SourceIcon size={14} className="text-cyan" />
            <h3 className="text-sm font-semibold text-text-main">{capture.title}</h3>
            {capture.trackedTagName && <StatusBadge tone="neon">{capture.trackedTagName}</StatusBadge>}
            <StatusBadge tone="muted">{capture.source}</StatusBadge>
          </div>
          {capture.snippet && <p className="mt-1 text-xs text-text-soft">{capture.snippet}</p>}
          {capture.occurredAt && (
            <p className="mt-1 text-[11px] text-text-muted">
              {new Date(capture.occurredAt).toLocaleString()}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss capture"
          onClick={handleDismiss}
          className="rounded-md p-1 text-text-muted hover:bg-white/5 hover:text-text-main"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {capture.askFields.cost && (
          <label className="block">
            <span className="text-xs text-text-muted">Cost (EUR)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={costAmount}
              onChange={(event) => setCostAmount(event.target.value)}
              className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
              data-test-id={`capture-cost-${capture.id}`}
            />
          </label>
        )}
        {capture.askFields.duration && (
          <label className="block">
            <span className="text-xs text-text-muted">Duration (minutes)</span>
            <input
              type="number"
              min={0}
              value={timeSpentMinutes}
              onChange={(event) => setTimeSpentMinutes(event.target.value)}
              className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
            />
          </label>
        )}
        {capture.askFields.location && (
          <label className="block">
            <span className="text-xs text-text-muted">Location</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
            />
          </label>
        )}
        {capture.askFields.counterparty && (
          <label className="block">
            <span className="text-xs text-text-muted">Counterparty</span>
            <input
              value={counterparty}
              onChange={(event) => setCounterparty(event.target.value)}
              className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
            />
          </label>
        )}
        <label className="block sm:col-span-2">
          <span className="text-xs text-text-muted">Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            className="mt-1 w-full resize-y rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
          />
        </label>
      </div>

      <label className="mt-2 inline-flex items-center gap-2 text-xs text-text-soft">
        <input
          type="checkbox"
          checked={createTask}
          onChange={(event) => setCreateTask(event.target.checked)}
          className="accent-cyan"
        />
        Also create a task
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <GlowButton
          size="sm"
          onClick={handleSave}
          loading={actions.answer.isPending}
          data-test-id={`capture-save-${capture.id}`}
        >
          Save
        </GlowButton>
        <GlowButton size="sm" variant="ghost" onClick={handleSnooze} loading={actions.snooze.isPending}>
          Snooze 1 day
        </GlowButton>
        <GlowButton size="sm" variant="ghost" onClick={handleDismiss} loading={actions.dismiss.isPending}>
          Dismiss
        </GlowButton>
      </div>
    </GlassCard>
  );
};

export const PendingCapturesPanel = () => {
  const captures = usePendingCaptures();

  if (captures.isLoading) {
    return (
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          <Clock3 size={12} /> Pending captures
        </div>
        <Skeleton className="mt-3 h-32 w-full" />
      </GlassCard>
    );
  }

  if ((captures.data?.length ?? 0) === 0) return null;

  return (
    <div className="space-y-3" data-test-id="pending-captures-panel">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
        <AlarmClock size={12} /> Pending captures ({captures.data!.length})
      </div>
      {captures.data!.map((capture) => (
        <CaptureCard key={capture.id} capture={capture} />
      ))}
    </div>
  );
};
