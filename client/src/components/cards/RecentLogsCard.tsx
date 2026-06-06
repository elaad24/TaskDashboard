import { ScrollText, Wallet, BookOpen, Check, FileText, Lightbulb, Plus } from 'lucide-react';
import type { DashboardLog, Log } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatMinutes, formatRelative } from '@/lib/format';

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
    case 'task_created':
      return <Plus size={14} />;
    case 'note':
    default:
      return <FileText size={14} />;
  }
};

type RecentLogsCardProps = {
  logs: Array<DashboardLog>;
  loading?: boolean;
};

export const RecentLogsCard = ({ logs, loading }: RecentLogsCardProps) => (
  <GlassCard interactive className="flex h-full flex-col p-5">
    <SectionHeader icon={<ScrollText size={16} />} title="Recent Logs" />

    {loading ? (
      <div className="mt-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    ) : logs.length === 0 ? (
      <EmptyState
        className="mt-4 flex-1"
        title="No history yet."
        description="Completed tasks, added tasks, and notes will appear here."
      />
    ) : (
      <ul className="mt-4 divide-y divide-border-subtle">
        {logs.slice(0, 6).map((log) => (
          <li key={log.id} className="flex items-start gap-3 py-2.5">
            <div className="mt-0.5 text-text-soft">{kindIcon(log.kind)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm text-text-main">
                <span className="truncate">{log.title}</span>
              </div>
              {log.taskTitle && log.kind !== 'completion' && log.kind !== 'task_created' && (
                <p className="mt-0.5 truncate text-[11px] text-text-soft" data-test-id="log-task-title">
                  for task: {log.taskTitle}
                </p>
              )}
              {log.kind === 'task_created' && log.task && (
                <div
                  className="mt-1 space-y-1 text-[11px] text-text-soft"
                  data-test-id="log-task-details"
                >
                  {log.task.description && (
                    <p className="line-clamp-2">{log.task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {log.areaName && (
                      <StatusBadge tone="cyan">{log.areaName}</StatusBadge>
                    )}
                    <StatusBadge tone={log.task.priority === 'high' || log.task.priority === 'critical' ? 'amber' : 'muted'}>
                      {log.task.priority}
                    </StatusBadge>
                    <StatusBadge tone="muted">{log.task.source}</StatusBadge>
                    {log.task.estimatedMinutes != null && (
                      <span>{formatMinutes(log.task.estimatedMinutes)}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                <span>{formatRelative(log.occurredAt)}</span>
                {log.costAmount !== null && (
                  <>
                    <span>·</span>
                    <span className="text-neon">{formatCurrency(log.costAmount, log.costCurrency)}</span>
                  </>
                )}
                {log.timeSpentMinutes && (
                  <>
                    <span>·</span>
                    <span>{formatMinutes(log.timeSpentMinutes)}</span>
                  </>
                )}
                <StatusBadge tone="muted" className="ml-auto">
                  {log.kind}
                </StatusBadge>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </GlassCard>
);
