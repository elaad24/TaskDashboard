import { Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Goal } from '@command-center/shared';
import { SortableList } from '@/components/dnd/SortableList';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useReorderGoals } from '@/hooks/useGoals';

type ActiveGoalsCardProps = {
  goals: Array<Goal>;
  loading?: boolean;
};

export const ActiveGoalsCard = ({ goals, loading }: ActiveGoalsCardProps) => {
  const reorderGoals = useReorderGoals();
  const visibleGoals = goals.slice(0, 4);

  return (
    <GlassCard interactive className="flex h-full flex-col p-5">
      <SectionHeader
        icon={<Target size={16} />}
        title="Active Goals"
        subtitle={goals.length > 0 ? `${goals.length} in motion · drag to reprioritize` : undefined}
      />

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          className="mt-4 flex-1"
          title="No active goals."
          description="Add a long-term outcome you're pushing toward."
        />
      ) : (
        <div className="mt-4">
          <SortableList
            items={visibleGoals}
            disabled={reorderGoals.isPending}
            onReorder={(orderedIds) => reorderGoals.mutateAsync({ orderedIds })}
            renderItem={(goal) => (
              <Link
                to={`/goals/${goal.id}`}
                className="flex items-start gap-3 rounded-lg border border-border-subtle bg-white/[0.02] p-3 transition-all hover:border-border-accent hover:bg-cyan/[0.03]"
              >
                <ProgressRing value={goal.progress} size={48} strokeWidth={4} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-main">{goal.title}</div>
                  {goal.nextAction && (
                    <div className="mt-1 text-xs text-text-soft">
                      <span className="text-text-muted">Next:</span> {goal.nextAction}
                    </div>
                  )}
                </div>
              </Link>
            )}
          />
        </div>
      )}
    </GlassCard>
  );
};
