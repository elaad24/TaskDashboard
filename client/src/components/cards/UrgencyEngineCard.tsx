import { Gauge } from 'lucide-react';
import type { UrgencyMetric, UrgencyStatus } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';

type UrgencyEngineCardProps = {
  metrics: Array<UrgencyMetric>;
  currency: string;
  loading?: boolean;
};

const statusToTone = (status: UrgencyStatus): 'neon' | 'cyan' | 'amber' | 'danger' => {
  if (status === 'ahead') return 'neon';
  if (status === 'on_track') return 'cyan';
  if (status === 'behind') return 'amber';
  return 'danger';
};

const formatValue = (metric: UrgencyMetric, currency: string): string => {
  if (metric.key === 'spend') return formatCurrency(metric.value, currency);
  if (metric.unit === 'min') return `${metric.value}m`;
  return String(metric.value);
};

const formatBaseline = (metric: UrgencyMetric, currency: string): string => {
  if (metric.key === 'spend') return `~${formatCurrency(metric.baseline, currency)}/wk avg`;
  if (metric.unit === 'min') return `~${Math.round(metric.baseline)}/wk avg`;
  return `~${Math.round(metric.baseline)}/wk avg`;
};

const Sparkline = ({ points }: { points: Array<{ date: string; value: number }> }) => {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="flex h-6 items-end gap-px" aria-hidden>
      {points.map((p) => (
        <div
          key={p.date}
          className="w-1 rounded-sm bg-cyan/40"
          style={{ height: `${Math.max(8, (p.value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
};

const MetricRow = ({ metric, currency }: { metric: UrgencyMetric; currency: string }) => {
  const pulse = metric.status === 'behind' || metric.status === 'critical';
  const deltaLabel =
    metric.deltaPct === 0
      ? 'on pace'
      : `${metric.deltaPct > 0 ? '+' : ''}${metric.deltaPct}% vs avg`;

  return (
    <div
      className={cn(
        'rounded-lg border border-border-subtle bg-white/[0.02] p-3 transition-all',
        pulse && 'motion-safe:animate-pulse-slow border-amber/30',
        metric.status === 'critical' && 'border-danger/40',
      )}
      data-test-id={`urgency-metric-${metric.key}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-text-main">{metric.label}</div>
          <div className="mt-0.5 text-xs text-text-soft">
            {formatValue(metric, currency)} · {formatBaseline(metric, currency)}
          </div>
        </div>
        <StatusBadge tone={statusToTone(metric.status)} dot>
          {metric.status.replace('_', ' ')}
        </StatusBadge>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span
          className={cn(
            'text-[11px] font-medium',
            metric.status === 'critical' || metric.status === 'behind'
              ? 'text-amber-400'
              : 'text-text-muted',
          )}
        >
          {deltaLabel}
        </span>
        <Sparkline points={metric.trend14d} />
      </div>
    </div>
  );
};

export const UrgencyEngineCard = ({ metrics, currency, loading }: UrgencyEngineCardProps) => (
  <GlassCard variant="amber" className="flex h-full flex-col p-5">
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-amber-400">
      <Gauge size={12} />
      Urgency engine
    </div>
    <p className="mt-1 text-xs text-text-soft">Auto baseline from your last 4 weeks</p>

    {loading ? (
      <div className="mt-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    ) : (
      <div className="mt-4 space-y-2">
        {metrics.map((metric) => (
          <MetricRow key={metric.key} metric={metric} currency={currency} />
        ))}
      </div>
    )}
  </GlassCard>
);
