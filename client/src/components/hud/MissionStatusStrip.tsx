import type { UrgencyStatus } from '@command-center/shared';
import { cn } from '@/lib/cn';

const statusTone: Record<UrgencyStatus, string> = {
  ahead: 'border-neon/40 bg-neon/5',
  on_track: 'border-cyan/30 bg-cyan/5',
  behind: 'border-amber/40 bg-amber/5 motion-safe:animate-pulse-slow',
  critical: 'border-danger/50 bg-danger/10 motion-safe:animate-pulse-slow',
};

const statusText: Record<UrgencyStatus, string> = {
  ahead: 'text-neon',
  on_track: 'text-cyan-200',
  behind: 'text-amber-400',
  critical: 'text-danger-400',
};

type MissionStatusStripProps = {
  summary: string;
  status: UrgencyStatus;
  loading?: boolean;
};

export const MissionStatusStrip = ({ summary, status, loading }: MissionStatusStripProps) => {
  if (loading) {
    return (
      <div
        className="rounded-lg border border-border-subtle bg-bg-mid/30 px-4 py-2.5"
        data-test-id="mission-status-strip"
      >
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-2.5 font-mono text-xs uppercase tracking-wider',
        statusTone[status],
      )}
      data-test-id="mission-status-strip"
      role="status"
    >
      <span className="text-text-muted">Mission status: </span>
      <span className={cn('font-semibold', statusText[status])}>{summary}</span>
    </div>
  );
};
