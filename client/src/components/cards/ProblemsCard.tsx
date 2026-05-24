import { useState } from 'react';
import { AlertOctagon, Sparkles } from 'lucide-react';
import type { Problem, SolveProblemResponse } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSolveProblem } from '@/hooks/useNavigator';
import { useCreateTask } from '@/hooks/useTasks';

type ProblemsCardProps = {
  problems: Array<Problem>;
  loading?: boolean;
};

export const ProblemsCard = ({ problems, loading }: ProblemsCardProps) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<Record<string, SolveProblemResponse>>({});
  const solveMutation = useSolveProblem();
  const createTask = useCreateTask();

  const handleGenerate = async (problemId: string) => {
    setOpenId(problemId);
    const result = await solveMutation.mutateAsync(problemId);
    setAiResult((prev) => ({ ...prev, [problemId]: result }));
  };

  const handleConvert = async (problemId: string) => {
    const result = aiResult[problemId];
    if (!result) return;
    const problem = problems.find((p) => p.id === problemId);
    for (const t of result.suggestedTasks) {
      await createTask.mutateAsync({
        title: t.title,
        description: t.description ?? undefined,
        priority: (t.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
        estimatedMinutes: t.estimatedMinutes ?? undefined,
        areaId: problem?.areaId ?? undefined,
        problemId,
        source: 'ai',
        reason: t.reason ?? `Resolves: ${problem?.title ?? 'problem'}`,
      });
    }
    setOpenId(null);
  };

  return (
    <GlassCard variant={problems.length > 0 ? 'amber' : 'default'} interactive className="flex h-full flex-col p-5">
      <SectionHeader
        icon={<AlertOctagon size={16} />}
        title="Problems / Blockers"
        subtitle={problems.length > 0 ? `${problems.length} open` : undefined}
      />

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : problems.length === 0 ? (
        <EmptyState
          className="mt-4 flex-1"
          title="No active blockers."
          description="When something gets in your way, capture it as a problem and Navigator will plan it out."
        />
      ) : (
        <ul className="mt-4 space-y-3">
          {problems.slice(0, 3).map((p) => {
            const aiData = aiResult[p.id];
            return (
              <li key={p.id}>
                <div className="rounded-lg border border-amber/30 bg-amber/[0.04] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-main">{p.title}</div>
                      {p.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-text-soft">{p.description}</p>
                      )}
                    </div>
                    <StatusBadge tone="amber" dot>
                      {p.status}
                    </StatusBadge>
                  </div>

                  {p.aiInterpretation && !aiData && (
                    <p className="mt-2 text-xs italic text-text-soft">
                      Navigator: {p.aiInterpretation}
                    </p>
                  )}

                  {aiData && (
                    <div className="mt-3 rounded-md border border-border-card bg-cyan/[0.04] p-2.5">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                        Suggested plan
                      </div>
                      <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-text-soft">
                        {aiData.plan.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!aiData ? (
                      <GlowButton
                        size="sm"
                        variant="ghost"
                        leftIcon={<Sparkles size={12} />}
                        loading={solveMutation.isPending && openId === p.id}
                        onClick={() => handleGenerate(p.id)}
                        data-test-id={`problem-generate-plan-${p.id}`}
                      >
                        Generate action plan
                      </GlowButton>
                    ) : (
                      <GlowButton
                        size="sm"
                        loading={createTask.isPending}
                        onClick={() => handleConvert(p.id)}
                        data-test-id={`problem-convert-tasks-${p.id}`}
                      >
                        Convert to {aiData.suggestedTasks.length} tasks
                      </GlowButton>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
};
