import { useState } from 'react';
import { Wallet, BookOpen, Check, FileText, Lightbulb } from 'lucide-react';
import type { Log } from '@command-center/shared';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLogs } from '@/hooks/useLogs';
import { useAreas } from '@/hooks/useAreas';
import { formatCurrency, formatMinutes, formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

const KINDS: Array<{ key: Log['kind'] | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'completion', label: 'Completed' },
  { key: 'expense', label: 'Expenses' },
  { key: 'study', label: 'Study' },
  { key: 'note', label: 'Notes' },
  { key: 'decision', label: 'Decisions' },
];

const kindIcon = (k: Log['kind']) => {
  switch (k) {
    case 'expense':
      return <Wallet size={14} />;
    case 'study':
      return <BookOpen size={14} />;
    case 'completion':
      return <Check size={14} />;
    case 'decision':
      return <Lightbulb size={14} />;
    case 'note':
    default:
      return <FileText size={14} />;
  }
};

export const LogsPage = () => {
  const [kind, setKind] = useState<Log['kind'] | 'all'>('all');
  const filters = kind === 'all' ? { limit: 200 } : { kind, limit: 200 };
  const { data: logs, isLoading } = useLogs(filters);
  const { data: areas } = useAreas();
  const areaName = (id: string | null): string =>
    areas?.find((a) => a.id === id)?.name ?? 'General';

  return (
    <PageScroll>
      <PageHeader
        title="Logs"
        description="History of your actions, costs, study sessions, and decisions."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setKind(k.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] transition-all',
              kind === k.key
                ? 'border-border-accent-strong bg-cyan/10 text-cyan-200'
                : 'border-border-subtle bg-white/[0.02] text-text-soft hover:border-border-accent hover:text-text-main',
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <GlassCard className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (logs?.length ?? 0) === 0 ? (
          <EmptyState
            title="No history yet."
            description="Completed tasks and notes will appear here."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {logs!.map((log) => (
              <li key={log.id} className="flex items-start gap-3 py-2.5">
                <div className="mt-0.5 text-text-soft">{kindIcon(log.kind)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text-main">{log.title}</div>
                  {log.content && (
                    <p className="mt-0.5 text-xs text-text-soft">{log.content}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                    <span>{formatRelative(log.occurredAt)}</span>
                    <span>·</span>
                    <span>{areaName(log.areaId)}</span>
                    {log.costAmount !== null && (
                      <>
                        <span>·</span>
                        <span className="text-neon">
                          {log.costCurrency &&
                          log.costCurrency.toUpperCase() !== 'EUR' &&
                          log.costAmountEur != null ? (
                            <>
                              {formatCurrency(log.costAmountEur, 'EUR')}
                              <span className="ml-1 text-text-muted">
                                (originally {formatCurrency(log.costAmount, log.costCurrency)})
                              </span>
                            </>
                          ) : (
                            formatCurrency(log.costAmount, log.costCurrency)
                          )}
                        </span>
                      </>
                    )}
                    {log.timeSpentMinutes && (
                      <>
                        <span>·</span>
                        <span>{formatMinutes(log.timeSpentMinutes)}</span>
                      </>
                    )}
                  </div>
                </div>
                <StatusBadge tone="muted">{log.kind}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </PageScroll>
  );
};
