import { useState } from 'react';
import { ListChecks, Check } from 'lucide-react';
import type { Task } from '@command-center/shared';
import { SortableList } from '@/components/dnd/SortableList';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { EditTaskModal } from '@/components/ui/EditTaskModal';
import { TaskActionsMenu } from '@/components/ui/TaskActionsMenu';
import { useCompleteTask, useReorderTasks } from '@/hooks/useTasks';
import { formatMinutes } from '@/lib/format';
import { useAreas } from '@/hooks/useAreas';

type NextActionsCardProps = {
  tasks: Array<Task>;
  loading?: boolean;
};

export const NextActionsCard = ({ tasks, loading }: NextActionsCardProps) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const completeMutation = useCompleteTask();
  const reorderTasks = useReorderTasks();
  const { data: areas } = useAreas();
  const visibleTasks = tasks.slice(0, 5);
  const areaName = (id: string | null): string =>
    areas?.find((a) => a.id === id)?.name ?? 'General';

  return (
    <GlassCard interactive className="flex h-full flex-col p-5">
      <SectionHeader
        icon={<ListChecks size={16} />}
        title="Next Best Actions"
        subtitle="Drag to reprioritize · top = do first"
      />

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          className="mt-4 flex-1"
          title="No active actions."
          description="Use the command input to create a task, goal, or problem."
        />
      ) : (
        <div className="mt-4">
          <SortableList
            items={visibleTasks}
            disabled={reorderTasks.isPending}
            onReorder={(orderedIds) => reorderTasks.mutateAsync({ orderedIds })}
            renderItem={(task, index) => (
              <div className="group flex items-start gap-3 rounded-lg border border-border-subtle bg-white/[0.02] p-3 transition-all hover:border-border-accent hover:bg-cyan/[0.03]">
                <div className="mt-0.5 font-mono text-xs text-text-muted">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-text-main">
                    {task.title}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge tone="muted">{areaName(task.areaId)}</StatusBadge>
                    <StatusBadge tone="muted">~{formatMinutes(task.estimatedMinutes ?? null)}</StatusBadge>
                    {task.source === 'ai' && <StatusBadge tone="cyan">AI</StatusBadge>}
                  </div>
                  {task.reason && (
                    <p className="mt-1.5 line-clamp-1 text-xs text-text-soft">
                      Reason: {task.reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <TaskActionsMenu
                    task={task}
                    onEdit={setEditingTask}
                    className="opacity-0 group-hover:opacity-100"
                  />
                  <GlowButton
                    size="sm"
                    variant="subtle"
                    leftIcon={<Check size={12} />}
                    loading={completeMutation.isPending && completeMutation.variables?.id === task.id}
                    onClick={() => completeMutation.mutate({ id: task.id, input: {} })}
                    aria-label={`Complete ${task.title}`}
                  >
                    Done
                  </GlowButton>
                </div>
              </div>
            )}
          />
        </div>
      )}

      <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />
    </GlassCard>
  );
};
