import { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import type { StreakDay } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAreas } from '@/hooks/useAreas';
import { cn } from '@/lib/cn';

type StreakHeatmapCardProps = {
  days: Array<StreakDay>;
  currentStreak: number;
  longestStreak: number;
  loading?: boolean;
  areaId?: string;
  onAreaChange?: (areaId: string | undefined) => void;
};

const intensityClass = (count: number): string => {
  if (count === 0) return 'bg-white/[0.04]';
  if (count === 1) return 'bg-cyan/20';
  if (count === 2) return 'bg-cyan/35';
  if (count <= 4) return 'bg-cyan/50';
  return 'bg-neon/60';
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const StreakHeatmapCard = ({
  days,
  currentStreak,
  longestStreak,
  loading,
  areaId,
  onAreaChange,
}: StreakHeatmapCardProps) => {
  const { data: areas } = useAreas();
  const [hovered, setHovered] = useState<StreakDay | null>(null);
  const today = todayIso();

  const weeks = useMemo(() => {
    const cols: Array<Array<StreakDay>> = [];
    for (let w = 0; w < 12; w += 1) {
      cols.push(days.slice(w * 7, w * 7 + 7));
    }
    return cols;
  }, [days]);

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          <Flame size={12} />
          Consistency heatmap
        </div>
        {onAreaChange && (
          <select
            value={areaId ?? ''}
            onChange={(e) => onAreaChange(e.target.value || undefined)}
            className="rounded-md border border-border-subtle bg-bg-deep/60 px-2 py-1 text-xs text-text-main"
            aria-label="Filter streak by area"
            data-test-id="streak-area-filter"
          >
            <option value="">All areas</option>
            {areas?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="mt-1 text-xs text-text-soft">
        Current streak: {currentStreak} days · Longest: {longestStreak}
      </p>

      {loading ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : (
        <>
          <div
            className="mt-4 flex gap-1 overflow-x-auto pb-1"
            data-test-id="streak-heatmap"
            role="img"
            aria-label="Task completion heatmap for the last 12 weeks"
          >
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={cn(
                      'h-3 w-3 rounded-sm border border-transparent transition-colors',
                      intensityClass(day.count),
                      day.date === today && day.count > 0 && 'motion-safe:animate-pulse-slow border-cyan/50',
                    )}
                    onMouseEnter={() => setHovered(day)}
                    onMouseLeave={() => setHovered(null)}
                    title={`${day.date}: ${day.count} completions`}
                  />
                ))}
              </div>
            ))}
          </div>
          {hovered && (
            <p className="mt-2 text-[11px] text-text-muted">
              {hovered.date}: {hovered.count} completion{hovered.count === 1 ? '' : 's'}
            </p>
          )}
        </>
      )}
    </GlassCard>
  );
};
