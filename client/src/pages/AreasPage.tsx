import { useMemo, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAreas, useCreateArea } from '@/hooks/useAreas';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useLogs } from '@/hooks/useLogs';
import { formatRelative } from '@/lib/format';

export const AreasPage = () => {
  const { data: areas, isLoading } = useAreas();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('selected') ?? areas?.[0]?.id ?? null;
  const create = useCreateArea();
  const [newName, setNewName] = useState('');

  const tasks = useTasks(selectedId ? { areaId: selectedId, filter: 'open' } : undefined);
  const goals = useGoals(selectedId ? { areaId: selectedId, status: 'active' } : undefined);
  const logs = useLogs(selectedId ? { areaId: selectedId, limit: 20 } : undefined);

  const blockedCount = useMemo(
    () => tasks.data?.filter((t) => t.status === 'blocked').length ?? 0,
    [tasks.data],
  );

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await create.mutateAsync({ name });
    setNewName('');
  };

  const selectArea = (id: string) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set('selected', id);
      return next;
    });
  };

  return (
    <PageScroll>
      <PageHeader
        title="Areas"
        description="Major life domains. Click any card to filter goals, tasks, and logs."
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
              <Layers size={12} /> All Areas
            </div>
          </div>

          {isLoading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (areas?.length ?? 0) === 0 ? (
            <EmptyState
              className="mt-4"
              title="No areas yet."
              description="Add a domain like Aviation, Study, Food, etc."
            />
          ) : (
            <ul className="mt-4 space-y-2">
              {areas!.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => selectArea(a.id)}
                    className={
                      selectedId === a.id
                        ? 'flex w-full items-center justify-between gap-3 rounded-lg border border-border-accent-strong bg-cyan/10 px-3 py-2.5 text-left transition-all'
                        : 'flex w-full items-center justify-between gap-3 rounded-lg border border-border-subtle bg-white/[0.02] px-3 py-2.5 text-left transition-all hover:border-border-accent hover:bg-cyan/[0.03]'
                    }
                    data-test-id={`area-${a.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: a.color ?? '#00D9FF', boxShadow: `0 0 10px ${a.color ?? '#00D9FF'}` }}
                      />
                      <span className="text-sm font-medium text-text-main">{a.name}</span>
                    </div>
                    <StatusBadge tone={a.status === 'active' ? 'cyan' : 'muted'}>
                      {a.status}
                    </StatusBadge>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="New area..."
              className="flex-1 rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-border-accent focus:outline-none"
              data-test-id="new-area-input"
            />
            <GlowButton
              size="sm"
              leftIcon={<Plus size={12} />}
              onClick={handleCreate}
              loading={create.isPending}
              disabled={!newName.trim()}
            >
              Add
            </GlowButton>
          </div>
        </GlassCard>

        <div className="space-y-4">
          {!selectedId ? (
            <GlassCard className="p-5">
              <EmptyState
                title="Pick an area"
                description="Select an area on the left to view its goals, open tasks, and recent logs."
              />
            </GlassCard>
          ) : (
            <>
              <GlassCard variant="cyan" className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-text-main">
                    {areas?.find((a) => a.id === selectedId)?.name ?? 'Area'}
                  </h2>
                  <div className="flex gap-1.5">
                    <StatusBadge tone="cyan">{tasks.data?.length ?? 0} open</StatusBadge>
                    {blockedCount > 0 && (
                      <StatusBadge tone="danger" dot>
                        {blockedCount} blocked
                      </StatusBadge>
                    )}
                    <StatusBadge tone="neon">{goals.data?.length ?? 0} goals</StatusBadge>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                  Active goals
                </div>
                {(goals.data?.length ?? 0) === 0 ? (
                  <EmptyState className="mt-3" title="No active goals in this area." />
                ) : (
                  <ul className="mt-3 space-y-2">
                    {goals.data!.map((g) => (
                      <li
                        key={g.id}
                        className="rounded-lg border border-border-subtle bg-white/[0.02] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm text-text-main">{g.title}</div>
                          <StatusBadge tone="cyan">{Math.round(g.progress)}%</StatusBadge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>

              <GlassCard className="p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                  Open tasks
                </div>
                {(tasks.data?.length ?? 0) === 0 ? (
                  <EmptyState className="mt-3" title="No open tasks here." />
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {tasks.data!.slice(0, 8).map((t) => (
                      <li key={t.id} className="flex items-center justify-between text-sm">
                        <span className="text-text-main">{t.title}</span>
                        <StatusBadge tone="muted">{t.priority}</StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>

              <GlassCard className="p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                  Recent activity
                </div>
                {(logs.data?.length ?? 0) === 0 ? (
                  <EmptyState className="mt-3" title="No logs yet." />
                ) : (
                  <ul className="mt-3 divide-y divide-border-subtle">
                    {logs.data!.slice(0, 8).map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <span className="truncate text-text-main">{l.title}</span>
                        <span className="text-[11px] text-text-muted">
                          {formatRelative(l.occurredAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </PageScroll>
  );
};
