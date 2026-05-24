import { Link } from 'react-router-dom';
import { Layers, ChevronRight } from 'lucide-react';
import type { DashboardAreaCard } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

type TracksCardProps = {
  tracks: Array<DashboardAreaCard>;
  loading?: boolean;
};

export const TracksCard = ({ tracks, loading }: TracksCardProps) => (
  <GlassCard interactive className="flex h-full flex-col p-5">
    <SectionHeader icon={<Layers size={16} />} title="Tracks / Areas" />

    {loading ? (
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    ) : tracks.length === 0 ? (
      <EmptyState
        className="mt-4 flex-1"
        title="No areas yet."
        description="Areas group goals, tasks, and logs by life domain."
      />
    ) : (
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tracks.map((t) => (
          <li key={t.id}>
            <Link
              to={`/areas?selected=${t.id}`}
              className="group flex items-start justify-between gap-2 rounded-lg border border-border-subtle bg-white/[0.02] p-3 transition-all hover:border-border-accent hover:bg-cyan/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: t.color ?? '#00D9FF',
                      boxShadow: `0 0 10px ${t.color ?? '#00D9FF'}`,
                    }}
                  />
                  <span className="text-sm font-medium text-text-main">{t.name}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge tone="muted">{t.openTaskCount} open</StatusBadge>
                  {t.blockedCount > 0 && (
                    <StatusBadge tone="danger" dot>
                      {t.blockedCount} blocked
                    </StatusBadge>
                  )}
                </div>
                {t.nextAction && (
                  <div className="mt-1.5 line-clamp-1 text-[11px] text-text-soft">
                    Next: {t.nextAction}
                  </div>
                )}
              </div>
              <ChevronRight size={14} className="mt-1 text-text-muted group-hover:text-cyan" />
            </Link>
          </li>
        ))}
      </ul>
    )}
  </GlassCard>
);
