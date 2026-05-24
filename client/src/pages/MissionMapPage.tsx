import { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Map as MapIcon, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { WorkSwitcher } from '@/components/nav/WorkSwitcher';
import { setLastWorkView } from '@/lib/workView';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAreas } from '@/hooks/useAreas';
import { useMissionMap } from '@/hooks/useMissionMap';
import { useCompleteTask } from '@/hooks/useTasks';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';

export const MissionMapPage = () => {
  const { data: areas } = useAreas();
  const [areaId, setAreaId] = useState<string | undefined>(undefined);
  const map = useMissionMap({ areaId });
  const completeTask = useCompleteTask();
  const reduceMotion = useReducedMotion();
  const prevLockedRef = useRef<Set<string>>(new Set());
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLastWorkView('mission-map');
  }, []);

  const nodePositions = useMemo(() => {
    const nodes = map.data?.nodes ?? [];
    const cols = 3;
    return nodes.map((node, index) => ({
      node,
      x: (index % cols) * 220 + 20,
      y: Math.floor(index / cols) * 120 + 20,
    }));
  }, [map.data?.nodes]);

  useEffect(() => {
    const nodes = map.data?.nodes ?? [];
    const currentlyLocked = new Set(nodes.filter((n) => n.locked).map((n) => n.task.id));
    const newlyUnlocked = [...prevLockedRef.current].filter((id) => !currentlyLocked.has(id));
    if (newlyUnlocked.length > 0) {
      setRevealedIds((prev) => new Set([...prev, ...newlyUnlocked]));
    }
    prevLockedRef.current = currentlyLocked;
  }, [map.data?.nodes]);

  const edges = map.data?.edges ?? [];

  const handleComplete = (taskId: string) => {
    void completeTask.mutateAsync({ id: taskId, input: {} });
  };

  return (
    <PageScroll>
      <WorkSwitcher />
      <PageHeader
        title="Mission Map"
        description="Finish prerequisites to unlock downstream tasks — your Jarvis tech tree."
        action={
          <select
            value={areaId ?? ''}
            onChange={(e) => setAreaId(e.target.value || undefined)}
            className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
            aria-label="Filter by area"
            data-test-id="mission-map-area-filter"
          >
            <option value="">All areas</option>
            {areas?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        }
      />

      {map.isLoading ? (
        <Skeleton className="h-96 w-full rounded-glass" />
      ) : (map.data?.nodes.length ?? 0) === 0 ? (
        <EmptyState
          icon={<MapIcon size={28} />}
          title="No tasks to map"
          description="Create open tasks and link prerequisites from task settings."
        />
      ) : (
        <GlassCard variant="cyan" className="overflow-x-auto p-4">
          <div
            className="relative min-h-[420px] min-w-[680px]"
            data-test-id="mission-map-canvas"
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              {edges.map((edge) => {
                const from = nodePositions.find((n) => n.node.task.id === edge.fromTaskId);
                const to = nodePositions.find((n) => n.node.task.id === edge.toTaskId);
                if (!from || !to) return null;
                return (
                  <line
                    key={edge.id}
                    x1={from.x + 90}
                    y1={from.y + 36}
                    x2={to.x + 90}
                    y2={to.y + 8}
                    stroke="rgb(var(--cc-cyan-rgb) / 0.35)"
                    strokeWidth={2}
                    markerEnd="url(#arrow)"
                  />
                );
              })}
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="rgb(var(--cc-cyan-rgb) / 0.5)" />
                </marker>
              </defs>
            </svg>

            {nodePositions.map(({ node, x, y }) => {
              const isRevealing = revealedIds.has(node.task.id) && !node.locked;
              const NodeWrapper = reduceMotion ? 'div' : motion.div;

              return (
                <NodeWrapper
                  key={node.task.id}
                  className={cn(
                    'absolute w-[180px] rounded-lg border p-3 transition-all',
                    node.locked
                      ? 'border-border-subtle bg-bg-deep/60 opacity-60'
                      : 'border-border-accent bg-cyan/5 shadow-glow-cyan',
                    isRevealing && !reduceMotion && 'animate-[pulse_0.6s_ease-out_2]',
                  )}
                  style={{ left: x, top: y }}
                  data-test-id={`mission-node-${node.task.id}`}
                  {...(!reduceMotion
                    ? {
                        initial: node.locked ? false : { scale: isRevealing ? 0.85 : 1, opacity: 1 },
                        animate: {
                          scale: isRevealing ? [0.85, 1.05, 1] : 1,
                          opacity: node.locked ? 0.6 : 1,
                        },
                        transition: { duration: 0.45 },
                      }
                    : {})}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="line-clamp-2 text-xs font-medium text-text-main">{node.task.title}</p>
                    {node.locked ? (
                      <Lock size={12} className="shrink-0 text-text-muted" aria-label="Locked" />
                    ) : (
                      <Unlock size={12} className="shrink-0 text-cyan" aria-label="Unlocked" />
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <StatusBadge tone={node.locked ? 'muted' : 'cyan'}>
                      {node.locked ? 'locked' : 'ready'}
                    </StatusBadge>
                    {!node.locked && node.task.status !== 'done' && (
                      <GlowButton
                        size="sm"
                        variant="subtle"
                        onClick={() => handleComplete(node.task.id)}
                        loading={
                          completeTask.isPending && completeTask.variables?.id === node.task.id
                        }
                      >
                        Done
                      </GlowButton>
                    )}
                  </div>
                  {node.incompletePrerequisites.length > 0 && (
                    <p className="mt-1 text-[10px] text-text-muted">
                      Needs: {node.incompletePrerequisites.map((t) => t.title).join(', ')}
                    </p>
                  )}
                </NodeWrapper>
              );
            })}
          </div>
        </GlassCard>
      )}
    </PageScroll>
  );
};
