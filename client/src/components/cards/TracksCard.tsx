import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ChevronRight, Menu, LayoutGrid } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { DashboardAreaCard, Task, Priority, TaskStatus } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { EditTaskModal } from '@/components/ui/EditTaskModal';
import { TaskActionsMenu } from '@/components/ui/TaskActionsMenu';
import { apiTasks } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

type TracksCardProps = {
  tracks: Array<DashboardAreaCard>;
  loading?: boolean;
};

const priorityTone = (p: Priority): 'danger' | 'amber' | 'cyan' | 'muted' => {
  switch (p) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'amber';
    case 'medium':
      return 'cyan';
    default:
      return 'muted';
  }
};

const statusTone = (s: TaskStatus): 'danger' | 'amber' | 'cyan' | 'muted' => {
  switch (s) {
    case 'blocked':
      return 'danger';
    case 'in_progress':
      return 'cyan';
    default:
      return 'muted';
  }
};

export const TracksCard = ({ tracks, loading }: TracksCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: openTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: queryKeys.tasks({ filter: 'open' }),
    queryFn: () => apiTasks.list({ filter: 'open' }),
    enabled: isExpanded,
  });

  const tasksByArea = openTasks.reduce<Record<string, Array<Task>>>((acc, task) => {
    if (!task.areaId) return acc;
    const areaTasks = acc[task.areaId] ?? [];
    areaTasks.push(task);
    acc[task.areaId] = areaTasks;
    return acc;
  }, {});

  const toggleButton = (
    <button
      type="button"
      onClick={() => setIsExpanded((prev) => !prev)}
      className="flex items-center justify-center rounded-md border border-border-subtle bg-white/[0.03] p-1.5 text-text-soft transition-colors hover:border-border-accent hover:text-cyan"
      aria-label={isExpanded ? 'Minimize view' : 'Expand view'}
      data-test-id="tracks-card-toggle"
    >
      {isExpanded ? <LayoutGrid size={14} /> : <Menu size={14} />}
    </button>
  );

  return (
    <GlassCard interactive className="flex h-full flex-col p-5">
      <SectionHeader icon={<Layers size={16} />} title="Tracks / Areas" action={toggleButton} />

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
      ) : isExpanded ? (
        <div className="mt-4 space-y-4" data-test-id="tracks-expanded-view">
          {tasksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            tracks.map((track) => {
              const tasks = tasksByArea[track.id] ?? [];
              return (
                <div key={track.id}>
                  <Link
                    to={`/areas?selected=${track.id}`}
                    className="group mb-2 flex items-center gap-2"
                  >
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{
                        background: track.color ?? '#00D9FF',
                        boxShadow: `0 0 8px ${track.color ?? '#00D9FF'}`,
                      }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-main group-hover:text-cyan">
                      {track.name}
                    </span>
                    <span className="text-[10px] text-text-muted">({tasks.length})</span>
                  </Link>

                  {tasks.length === 0 ? (
                    <p className="pl-4 text-[11px] text-text-muted">No open tasks</p>
                  ) : (
                    <ul className="space-y-1 pl-4">
                      {tasks.map((task) => (
                        <li
                          key={task.id}
                          className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm text-text-main">
                            {task.title}
                          </span>
                          <div className="flex flex-shrink-0 items-center gap-1.5">
                            <TaskActionsMenu
                              task={task}
                              onEdit={setEditingTask}
                              className="p-1 opacity-0 group-hover:opacity-100"
                            />
                            {task.status === 'blocked' && (
                              <StatusBadge tone={statusTone(task.status)} dot>
                                blocked
                              </StatusBadge>
                            )}
                            {task.status === 'in_progress' && (
                              <StatusBadge tone={statusTone(task.status)}>
                                in progress
                              </StatusBadge>
                            )}
                            <StatusBadge tone={priorityTone(task.priority)}>
                              {task.priority}
                            </StatusBadge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
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

      <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />
    </GlassCard>
  );
};
