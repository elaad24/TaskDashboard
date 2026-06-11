import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Plus, ArrowLeft, Target, Check } from 'lucide-react';
import type { GoalBreakdownResponse } from '@command-center/shared';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { WorkSwitcher } from '@/components/nav/WorkSwitcher';
import { setLastWorkView } from '@/lib/workView';
import { AnimatedPage } from '@/components/motion/AnimatedPage';
import { StaggerItem } from '@/components/motion/StaggerItem';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SortableList } from '@/components/dnd/SortableList';
import {
  useCompleteGoal,
  useCreateGoal,
  useGoal,
  useGoals,
  useReorderGoals,
  useUpdateGoal,
} from '@/hooks/useGoals';
import { useTasks, useCreateTask } from '@/hooks/useTasks';
import { useBreakdownGoal } from '@/hooks/useNavigator';
import { formatDate } from '@/lib/format';
import { useResources } from '@/hooks/useResources';

const GoalsList = () => {
  const { data: goals, isLoading } = useGoals();
  const create = useCreateGoal();
  const reorderGoals = useReorderGoals();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');

  useEffect(() => {
    setLastWorkView('goals');
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const g = await create.mutateAsync({ title: title.trim() });
    setTitle('');
    navigate(`/goals/${g.id}`);
  };

  return (
    <PageScroll>
      <AnimatedPage>
        <StaggerItem index={0}>
          <WorkSwitcher />
        </StaggerItem>
        <StaggerItem index={1}>
          <PageHeader
            title="Goals"
        description="Drag to reprioritize long-term outcomes."
        action={
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="New goal..."
              className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none"
              data-test-id="new-goal-input"
            />
            <GlowButton leftIcon={<Plus size={14} />} onClick={handleCreate} loading={create.isPending}>
              Add
            </GlowButton>
          </div>
        }
      />
        </StaggerItem>

        <StaggerItem index={2}>
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (goals?.length ?? 0) === 0 ? (
        <GlassCard interactive className="p-6">
          <EmptyState
            icon={<Target size={28} />}
            title="No goals yet."
            description="Add a long-term outcome above and Navigator can break it down into milestones."
          />
        </GlassCard>
      ) : (
        <SortableList
          items={goals ?? []}
          disabled={reorderGoals.isPending}
          onReorder={(orderedIds) => reorderGoals.mutateAsync({ orderedIds })}
          renderItem={(g) => (
            <GlassCard
              interactive
              className="cursor-pointer p-4 transition-all hover:border-border-accent"
              onClick={() => navigate(`/goals/${g.id}`)}
            >
              <div className="flex items-start gap-3">
                <ProgressRing value={g.progress} size={44} strokeWidth={4} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-main">{g.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={g.status === 'active' ? 'cyan' : 'muted'} dot>
                      {g.status}
                    </StatusBadge>
                    <StatusBadge
                      tone={g.priority === 'high' || g.priority === 'critical' ? 'amber' : 'muted'}
                    >
                      {g.priority}
                    </StatusBadge>
                    {g.targetDate && <StatusBadge tone="muted">by {formatDate(g.targetDate)}</StatusBadge>}
                  </div>
                  {g.nextAction && (
                    <p className="mt-1.5 text-xs text-text-soft">Next: {g.nextAction}</p>
                  )}
                </div>
              </div>
            </GlassCard>
          )}
        />
      )}
        </StaggerItem>
      </AnimatedPage>
    </PageScroll>
  );
};

const GoalDetail = ({ id }: { id: string }) => {
  const { data: goal, isLoading } = useGoal(id);
  const tasks = useTasks({ goalId: id });
  const update = useUpdateGoal();
  const completeGoal = useCompleteGoal();
  const breakdown = useBreakdownGoal();
  const createTask = useCreateTask();
  const navigate = useNavigate();
  const [aiResult, setAiResult] = useState<GoalBreakdownResponse | null>(null);
  const resources = useResources({ goalId: id });

  const handleBreakdown = async () => {
    setAiResult(null);
    const r = await breakdown.mutateAsync(id);
    setAiResult(r);
  };

  const handleCreatePlanTasks = async () => {
    if (!aiResult) return;
    for (const t of aiResult.tasks) {
      await createTask.mutateAsync({
        title: t.title,
        description: t.description ?? undefined,
        priority: (t.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
        estimatedMinutes: t.estimatedMinutes ?? undefined,
        goalId: id,
        areaId: goal?.areaId ?? undefined,
        source: 'ai',
        reason: t.reason ?? `Supports goal: ${goal?.title}`,
      });
    }
    setAiResult(null);
  };

  if (isLoading || !goal) {
    return (
      <PageScroll>
        <Skeleton className="h-64 w-full" />
      </PageScroll>
    );
  }

  return (
    <PageScroll>
      <button
        onClick={() => navigate('/goals')}
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-text-soft hover:text-cyan"
      >
        <ArrowLeft size={12} /> All goals
      </button>

      <GlassCard variant="cyan" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text-main">{goal.title}</h1>
            {goal.description && (
              <p className="mt-2 max-w-2xl text-sm text-text-soft">{goal.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge tone={goal.status === 'active' ? 'cyan' : 'muted'} dot>
                {goal.status}
              </StatusBadge>
              <StatusBadge
                tone={goal.priority === 'high' || goal.priority === 'critical' ? 'amber' : 'muted'}
              >
                {goal.priority}
              </StatusBadge>
              {goal.targetDate && <StatusBadge tone="muted">target {formatDate(goal.targetDate)}</StatusBadge>}
            </div>
          </div>
          <ProgressRing value={goal.progress} size={72} strokeWidth={6} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={goal.progress}
            onChange={(e) => update.mutate({ id: goal.id, input: { progress: Number(e.target.value) } })}
            className="w-48 accent-cyan"
            aria-label="Goal progress"
          />
          <span className="font-mono text-sm text-text-main">{Math.round(goal.progress)}%</span>
          <GlowButton
            variant="ghost"
            size="sm"
            leftIcon={<Sparkles size={12} />}
            loading={breakdown.isPending}
            onClick={handleBreakdown}
            data-test-id="goal-breakdown"
          >
            Generate plan
          </GlowButton>
          {goal.status !== 'done' && (
            <GlowButton
              size="sm"
              leftIcon={<Check size={12} />}
              loading={completeGoal.isPending}
              onClick={() => completeGoal.mutate({ id: goal.id, title: goal.title })}
              data-test-id="complete-goal"
            >
              Complete goal
            </GlowButton>
          )}
        </div>
      </GlassCard>

      {aiResult && (
        <GlassCard variant="cyan" glow className="mt-4 p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">AI plan</div>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-text-muted">Milestones</div>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-text-soft">
                {aiResult.milestones.map((m, i) => (
                  <li key={i}>{m.title}</li>
                ))}
              </ol>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-text-muted">Risks</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-text-soft">
                {aiResult.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs uppercase tracking-wider text-text-muted">Blockers</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-text-soft">
                {aiResult.blockers.length > 0 ? (
                  aiResult.blockers.map((b, i) => <li key={i}>{b}</li>)
                ) : (
                  <li className="list-none text-text-muted">None identified.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border-card bg-cyan/[0.04] p-3 text-sm text-text-main">
            <span className="text-cyan-200">First action:</span> {aiResult.firstAction}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <GlowButton onClick={handleCreatePlanTasks} loading={createTask.isPending}>
              Create {aiResult.tasks.length} suggested tasks
            </GlowButton>
            <GlowButton variant="ghost" onClick={() => setAiResult(null)}>
              Discard
            </GlowButton>
          </div>
        </GlassCard>
      )}

      <GlassCard className="mt-4 p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Tasks</div>
        {(tasks.data?.length ?? 0) === 0 ? (
          <EmptyState className="mt-3" title="No tasks yet for this goal." />
        ) : (
          <ul className="mt-3 space-y-1.5">
            {(tasks.data ?? []).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="text-text-main">{t.title}</span>
                <div className="flex items-center gap-1.5">
                  <StatusBadge tone="muted">{t.status}</StatusBadge>
                  <StatusBadge tone={t.priority === 'high' || t.priority === 'critical' ? 'amber' : 'muted'}>
                    {t.priority}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Resources</div>
          <GlowButton size="sm" variant="ghost" onClick={() => navigate('/resources')}>
            Open resources tab
          </GlowButton>
        </div>
        {(resources.data?.length ?? 0) === 0 ? (
          <EmptyState className="mt-3" title="No resources linked to this goal yet." />
        ) : (
          <ul className="mt-3 space-y-1.5">
            {(resources.data ?? []).map((resource) => (
              <li
                key={resource.id}
                className="rounded-md border border-border-subtle bg-white/[0.02] px-3 py-2 text-sm"
              >
                <div className="font-medium text-text-main">{resource.title}</div>
                {resource.url && (
                  <a href={resource.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300">
                    {resource.url}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </PageScroll>
  );
};

export const GoalsPage = () => {
  const params = useParams<{ id?: string }>();
  return params.id ? <GoalDetail id={params.id} /> : <GoalsList />;
};
