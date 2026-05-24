import { useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, Clock3, Target, Wallet, CalendarPlus } from 'lucide-react';
import type { OverviewResponse } from '@command-center/shared';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOverview, useOverviewBriefing, useReminderActions } from '@/hooks/useOverview';
import { GlowButton } from '@/components/ui/GlowButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatMinutes } from '@/lib/format';
import { CompletionsTrendCard, SpendTrendCard } from '@/components/overview/TrendsCard';
import { AudioSummaryButton } from '@/components/overview/AudioSummaryButton';
import { AnimatedPage } from '@/components/motion/AnimatedPage';
import { StaggerItem } from '@/components/motion/StaggerItem';
import { useAddToCalendar } from '@/hooks/useCalendar';
import { useToast } from '@/components/ui/Toast';

const errorMessage = (err: unknown): string => {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return 'Too many AI requests. Wait a minute, then retry manually.';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
};

type AttentionItem = {
  id: string;
  title: string;
  kind: 'Overdue task' | 'Stale goal' | 'Open problem' | 'Study review';
};

const buildAttentionItems = (data: OverviewResponse | undefined): Array<AttentionItem> => {
  if (!data) return [];
  const items: Array<AttentionItem> = [
    ...data.risks.overdueTasks.map((item) => ({
      id: `task-${item.id}`,
      title: item.title,
      kind: 'Overdue task' as const,
    })),
    ...data.risks.staleGoals.map((item) => ({
      id: `goal-${item.id}`,
      title: item.title,
      kind: 'Stale goal' as const,
    })),
    ...data.risks.oldOpenProblems.map((item) => ({
      id: `problem-${item.id}`,
      title: item.title,
      kind: 'Open problem' as const,
    })),
    ...data.risks.staleStudyTopics.map((item) => ({
      id: `study-${item.id}`,
      title: item.title,
      kind: 'Study review' as const,
    })),
  ];
  return items.slice(0, 5);
};

export const OverviewPage = () => {
  const overview = useOverview();
  const briefing = useOverviewBriefing();
  const reminderActions = useReminderActions();
  const calendar = useAddToCalendar();
  const toast = useToast();
  const briefedSnapshotAt = useRef<number | null>(null);

  useEffect(() => {
    if (!overview.data || overview.isLoading || overview.isError) return;
    if (briefing.isPending) return;
    if (briefing.data && briefedSnapshotAt.current === overview.dataUpdatedAt) return;
    if (briefing.isError && briefedSnapshotAt.current === overview.dataUpdatedAt) return;
    if (briefedSnapshotAt.current === overview.dataUpdatedAt) return;

    briefedSnapshotAt.current = overview.dataUpdatedAt;
    briefing.mutate(overview.data);
  }, [
    overview.data,
    overview.dataUpdatedAt,
    overview.isLoading,
    overview.isError,
    briefing.isPending,
    briefing.isError,
    briefing.data,
    briefing.mutate,
  ]);

  const handleRetryOverview = () => {
    briefedSnapshotAt.current = null;
    briefing.reset();
    void overview.refetch();
  };

  const handleRetryBriefing = () => {
    if (!overview.data) return;
    briefedSnapshotAt.current = null;
    briefing.reset();
  };

  const kpis = overview.data?.kpis;
  const attentionItems = useMemo(() => buildAttentionItems(overview.data), [overview.data]);

  if (overview.isError) {
    return (
      <PageScroll>
        <PageHeader
          title="Overview"
          description="30-60 second situational view: trends, risks, and what needs attention."
        />
        <GlassCard variant="danger" glow className="p-6">
          <h2 className="text-base font-semibold text-text-main">Could not load overview</h2>
          <p className="mt-2 text-sm text-text-soft">{errorMessage(overview.error)}</p>
          <GlowButton variant="ghost" className="mt-4" onClick={handleRetryOverview}>
            Retry
          </GlowButton>
        </GlassCard>
      </PageScroll>
    );
  }

  return (
    <PageScroll>
      <PageHeader
        title="Overview"
        description="30-60 second situational view: trends, risks, and what needs attention."
      />

      <AnimatedPage className="space-y-4">
        <StaggerItem index={0}>
          <GlassCard interactive className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Executive summary</div>
            <AudioSummaryButton
              briefing={briefing.data ?? null}
              isLoading={overview.isLoading || briefing.isPending}
            />
          </div>
          {overview.isLoading ? (
            <Skeleton className="mt-3 h-20 w-full" />
          ) : briefing.isPending ? (
            <Skeleton className="mt-3 h-20 w-full" />
          ) : briefing.isError ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-danger-400">{errorMessage(briefing.error)}</p>
              <GlowButton size="sm" variant="ghost" onClick={handleRetryBriefing}>
                Retry AI summary
              </GlowButton>
            </div>
          ) : briefing.data ? (
            <div className="mt-3 space-y-2">
              <p className="text-base font-semibold text-text-main">{briefing.data.headline}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-text-soft">
                {briefing.data.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="text-sm text-cyan-200">Focus next: {briefing.data.recommendedFocus}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-soft">Summary will appear after data loads.</p>
          )}
          </GlassCard>
        </StaggerItem>

        <StaggerItem index={1}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard interactive className="p-4">
            <div className="text-xs text-text-soft">Tasks</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-text-main">
              {overview.isLoading ? '—' : `${kpis?.tasksOpen ?? 0} open`}
            </div>
            <div className="mt-1 text-sm text-amber-300">
              {overview.isLoading ? '—' : `${kpis?.tasksOverdue ?? 0} overdue`}
            </div>
          </GlassCard>

          <GlassCard interactive className="p-4">
            <div className="flex items-center justify-between text-xs text-text-soft">
              <span>Spend this week</span>
              <Wallet size={14} className="text-cyan-300" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-text-main">
              {overview.isLoading ? '—' : formatCurrency(kpis?.spendThisWeek ?? 0)}
            </div>
          </GlassCard>

          <GlassCard interactive className="p-4">
            <div className="flex items-center justify-between text-xs text-text-soft">
              <span>Active goals</span>
              <Target size={14} className="text-cyan-300" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-text-main">
              {overview.isLoading ? '—' : kpis?.goalsActive ?? 0}
            </div>
            <div className="mt-1 text-sm text-text-soft">
              {overview.isLoading ? '—' : `${kpis?.goalsCompletedThisMonth ?? 0} done this month`}
            </div>
          </GlassCard>

          <GlassCard interactive className="p-4">
            <div className="flex items-center justify-between text-xs text-text-soft">
              <span>Study this week</span>
              <Clock3 size={14} className="text-cyan-300" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-text-main">
              {overview.isLoading ? '—' : formatMinutes(kpis?.studyMinutesThisWeek ?? 0)}
            </div>
            <div className="mt-1 text-sm text-text-soft">
              {overview.isLoading ? '—' : `${kpis?.tasksCompletedThisWeek ?? 0} tasks completed`}
            </div>
          </GlassCard>
          </div>
        </StaggerItem>

        <StaggerItem index={2}>
          <div className="grid gap-4 lg:grid-cols-2">
          <CompletionsTrendCard
            points={overview.data?.trends.completions14d ?? []}
            weekTotal={kpis?.tasksCompletedThisWeek ?? 0}
            loading={overview.isLoading}
          />
          <SpendTrendCard
            points={overview.data?.trends.spend14d ?? []}
            weekTotal={kpis?.spendThisWeek ?? 0}
            loading={overview.isLoading}
          />
          </div>
        </StaggerItem>

        <StaggerItem index={3}>
          <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard interactive className="p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Area progress</div>
            <div className="mt-3 space-y-2">
              {overview.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (overview.data?.areas.length ?? 0) === 0 ? (
                <EmptyState title="No areas yet" description="Create areas to track progress by life domain." />
              ) : (
                overview.data?.areas.map((area) => (
                  <div key={area.id} className="rounded-md border border-border-subtle p-3">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-text-main">{area.name}</span>
                      <span className="text-text-soft">{area.goalsProgressPct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-cyan"
                        style={{ width: `${Math.max(3, area.goalsProgressPct)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      Open tasks: {area.openTasks} · Last activity:{' '}
                      {area.lastActivityAt ? new Date(area.lastActivityAt).toLocaleDateString() : 'n/a'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard interactive className="p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Upcoming reminders</div>
            <div className="mt-3 space-y-2">
              {overview.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (overview.data?.upcomingReminders.length ?? 0) === 0 ? (
                <EmptyState
                  title="No upcoming reminders"
                  description="Reminders will appear here and in Telegram when scheduled."
                />
              ) : (
                overview.data?.upcomingReminders.map((item) => (
                  <div key={item.id} className="rounded-md border border-border-subtle p-3">
                    <div className="text-sm font-medium text-text-main">{item.title}</div>
                    <div className="text-xs text-text-soft">
                      {new Date(item.scheduledFor).toLocaleString()} · {item.status}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <GlowButton
                        size="sm"
                        variant="ghost"
                        leftIcon={<CalendarPlus size={14} />}
                        onClick={async () => {
                          try {
                            const result = await calendar.addReminder.mutateAsync(item.id);
                            toast.showSuccess('Added to calendar', result.htmlLink ?? undefined);
                          } catch (error) {
                            toast.showError('Calendar', calendar.getErrorMessage(error));
                          }
                        }}
                        loading={calendar.addReminder.isPending && calendar.addReminder.variables === item.id}
                        data-test-id={`reminder-calendar-${item.id}`}
                      >
                        Add to calendar
                      </GlowButton>
                      <GlowButton
                        size="sm"
                        variant="subtle"
                        onClick={() => reminderActions.markSent.mutate(item.id)}
                        loading={reminderActions.markSent.isPending}
                      >
                        Mark sent now
                      </GlowButton>
                      <GlowButton
                        size="sm"
                        variant="ghost"
                        onClick={() => reminderActions.cancel.mutate(item.id)}
                        loading={reminderActions.cancel.isPending}
                      >
                        Cancel
                      </GlowButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
          </div>
        </StaggerItem>

        <StaggerItem index={4}>
          <GlassCard interactive className="p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
            <AlertTriangle size={12} /> Needs attention
          </div>
          {overview.isLoading ? (
            <Skeleton className="mt-3 h-24 w-full" />
          ) : attentionItems.length === 0 ? (
            <p className="mt-3 text-sm text-text-soft">Nothing urgent right now — keep momentum.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {attentionItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border-subtle bg-white/[0.02] px-3 py-2"
                >
                  <span className="text-sm text-text-main">{item.title}</span>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide text-text-muted">{item.kind}</span>
                </li>
              ))}
            </ul>
          )}
          </GlassCard>
        </StaggerItem>
      </AnimatedPage>
    </PageScroll>
  );
};
