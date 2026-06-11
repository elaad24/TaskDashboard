import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OverviewResponse } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/format';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type TrendPoint = OverviewResponse['trends']['completions14d'][number];

type ChartRow = {
  date: string;
  label: string;
  value: number;
};

const toChartRows = (points: Array<TrendPoint>): Array<ChartRow> =>
  points.map((point) => ({
    date: point.date,
    label: new Date(`${point.date}T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    value: point.value,
  }));

const avgPerDay = (points: Array<TrendPoint>): number => {
  if (points.length === 0) return 0;
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return total / points.length;
};

const isAllZero = (points: Array<TrendPoint>): boolean => points.every((point) => point.value === 0);

type CompletionsTrendCardProps = {
  points: Array<TrendPoint>;
  weekTotal: number;
  loading?: boolean;
};

export const CompletionsTrendCard = ({ points, weekTotal, loading }: CompletionsTrendCardProps) => {
  const reduceMotion = useReducedMotion();
  const rows = toChartRows(points);
  const avg = avgPerDay(points);
  const chartAnimation = reduceMotion ? 0 : 800;

  return (
    <GlassCard interactive className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Completions (14d)</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-text-main">
            {loading ? '—' : weekTotal}
            <span className="ml-2 text-sm font-normal text-text-soft">this week</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted">Daily average</div>
          <div className="text-lg font-medium tabular-nums text-cyan-200">
            {loading ? '—' : avg.toFixed(1)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-44 animate-pulse rounded-md bg-white/[0.04]" />
      ) : isAllZero(points) ? (
        <EmptyState
          className="mt-4 h-44"
          title="No completions yet"
          description="Complete tasks this week to see your momentum chart."
        />
      ) : (
        <div className="mt-4 h-44" data-test-id="completions-trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
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
                formatter={(value) => [`${Number(value ?? 0)} tasks`, 'Completed']}
                labelFormatter={(label) => String(label)}
              />
              <Bar
                dataKey="value"
                fill="#00D9FF"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={!reduceMotion}
                animationDuration={chartAnimation}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
};

type SpendTrendCardProps = {
  points: Array<TrendPoint>;
  weekTotal: number;
  loading?: boolean;
};

export const SpendTrendCard = ({ points, weekTotal, loading }: SpendTrendCardProps) => {
  const reduceMotion = useReducedMotion();
  const rows = toChartRows(points);
  const avg = avgPerDay(points);
  const chartAnimation = reduceMotion ? 0 : 800;

  return (
    <GlassCard interactive className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Spend (14d)</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-text-main">
            {loading ? '—' : formatCurrency(weekTotal)}
            <span className="ml-2 text-sm font-normal text-text-soft">this week</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted">Daily average</div>
          <div className="text-lg font-medium tabular-nums text-cyan-200">
            {loading ? '—' : formatCurrency(avg)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-44 animate-pulse rounded-md bg-white/[0.04]" />
      ) : isAllZero(points) ? (
        <EmptyState
          className="mt-4 h-44"
          title="No spend logged"
          description="Log expenses in Logs to track spending trends."
        />
      ) : (
        <div className="mt-4 h-44" data-test-id="spend-trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D9FF" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#00D9FF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'rgba(10,14,22,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Spend']}
                labelFormatter={(label) => String(label)}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#00D9FF"
                strokeWidth={2}
                fill="url(#spendGradient)"
                isAnimationActive={!reduceMotion}
                animationDuration={chartAnimation}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
};
