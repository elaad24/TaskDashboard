import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FocusRange } from '@command-center/shared';
import {
  DISTRACTION_CATEGORY_LABELS,
  FOCUS_ACTIVITY_LABELS,
} from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFocusSessions, useFocusStats } from '@/hooks/useFocus';
import { formatElapsed } from '@/lib/focusTimer';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';

const RANGES: Array<{ key: FocusRange; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

const formatDurationMinutes = (seconds: number): string => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
};

export const FocusStats = () => {
  const [range, setRange] = useState<FocusRange>('week');
  const reduceMotion = useReducedMotion();
  const { data: stats, isLoading: statsLoading } = useFocusStats(range);
  const { data: sessions, isLoading: sessionsLoading } = useFocusSessions(range);
  const chartAnimation = reduceMotion ? 0 : 800;

  const distractionChartData =
    stats?.byDistraction.map((d) => ({
      label: DISTRACTION_CATEGORY_LABELS[d.category],
      count: d.count,
      duration: Math.round(d.totalDurationSeconds / 60),
    })) ?? [];

  const activityChartData =
    stats?.byActivity.map((a) => ({
      label: FOCUS_ACTIVITY_LABELS[a.activityType],
      avgMinutes: Math.round(a.avgDurationSeconds / 60),
      count: a.count,
    })) ?? [];

  return (
    <div className="space-y-4" data-test-id="focus-stats">
      <div className="flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] transition-all',
              range === r.key
                ? 'border-border-accent-strong bg-cyan/10 text-cyan-200'
                : 'border-border-subtle bg-white/[0.02] text-text-soft hover:border-border-accent hover:text-text-main',
            )}
            data-test-id={`focus-range-${r.key}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <GlassCard className="p-4">
              <div className="text-xs text-text-muted">Sessions</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-text-main">
                {stats?.totalSessions ?? 0}
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="text-xs text-text-muted">Total focus time</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-text-main">
                {formatDurationMinutes(stats?.totalDurationSeconds ?? 0)}
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="text-xs text-text-muted">Avg session length</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-cyan-200">
                {formatDurationMinutes(stats?.avgDurationSeconds ?? 0)}
              </div>
            </GlassCard>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
            Stops by reason
          </div>
          {statsLoading ? (
            <Skeleton className="mt-4 h-44 w-full" />
          ) : distractionChartData.length === 0 ? (
            <EmptyState
              className="mt-4 h-44"
              title="No data yet"
              description="Complete focus sessions to see what interrupts you most."
            />
          ) : (
            <div className="mt-4 h-44" data-test-id="focus-distraction-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distractionChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,217,255,0.08)' }}
                    contentStyle={{
                      background: 'rgba(10,14,22,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${Number(value ?? 0)} times`, 'Stops']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#00D9FF"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={!reduceMotion}
                    animationDuration={chartAnimation}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
            Avg time per activity
          </div>
          {statsLoading ? (
            <Skeleton className="mt-4 h-44 w-full" />
          ) : activityChartData.length === 0 ? (
            <EmptyState
              className="mt-4 h-44"
              title="No activities yet"
              description="Log sessions with different activity types to compare."
            />
          ) : (
            <div className="mt-4 h-44" data-test-id="focus-activity-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,217,255,0.08)' }}
                    contentStyle={{
                      background: 'rgba(10,14,22,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${Number(value ?? 0)} min`, 'Avg duration']}
                  />
                  <Bar
                    dataKey="avgMinutes"
                    fill="#7C3AED"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={!reduceMotion}
                    animationDuration={chartAnimation}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </div>

      {stats && stats.topDistractions.length > 0 && (
        <GlassCard className="p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
            Top 3 distractions
          </div>
          <ul className="mt-3 space-y-2">
            {stats.topDistractions.map((d, i) => (
              <li
                key={d.category}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="text-text-main">
                  {i + 1}. {DISTRACTION_CATEGORY_LABELS[d.category]}
                </span>
                <span className="text-xs text-text-muted">
                  {d.count}x · avg {formatDurationMinutes(d.avgDurationSeconds)}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      <GlassCard className="p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Recent sessions</div>
        {sessionsLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (sessions?.length ?? 0) === 0 ? (
          <EmptyState
            className="mt-3"
            title="No sessions yet"
            description="Your completed focus sessions will appear here."
          />
        ) : (
          <ul className="mt-3 divide-y divide-border-subtle">
            {sessions!.map((session) => (
              <li key={session.id} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text-main">
                    {session.description ?? FOCUS_ACTIVITY_LABELS[session.activityType]}
                  </div>
                  <p className="mt-0.5 text-xs text-text-soft">
                    {FOCUS_ACTIVITY_LABELS[session.activityType]}
                    {session.isLearning ? ' · learning' : ''} · stopped: {session.stopReason}
                  </p>
                  <div className="mt-1 text-[11px] text-text-muted">
                    {formatElapsed(session.durationSeconds)} ·{' '}
                    {new Date(session.startedAt).toLocaleString()}
                  </div>
                </div>
                <StatusBadge tone="muted">
                  {DISTRACTION_CATEGORY_LABELS[session.distractionCategory]}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
};
