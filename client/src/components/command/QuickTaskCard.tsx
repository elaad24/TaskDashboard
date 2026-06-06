import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ListPlus, Pencil, X, Zap } from 'lucide-react';
import type { CreateTaskInput, ParseResponse, Priority } from '@command-center/shared';
import { ReanalyzePanel } from '@/components/command/ReanalyzePanel';
import { TaskComplexityToggle } from '@/components/command/TaskComplexityToggle';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useConfirmParse } from '@/hooks/useNavigator';
import { useAreas } from '@/hooks/useAreas';

type QuickTaskCardProps = {
  /** The current parse result — controlled by the parent (ParseResultCard). */
  result: ParseResponse;
  rawInput: string;
  onClose: () => void;
  onConfirmed?: () => void;
  wasCorrected: boolean;
  isPending: boolean;
  onReanalyze: (correction: string) => void;
  onMakeSimple: () => void;
  onMakeComplex: () => void;
  onRequestFullReview: () => void;
};

export const QuickTaskCard = ({
  result,
  rawInput,
  onClose,
  onConfirmed,
  wasCorrected,
  isPending,
  onReanalyze,
  onMakeSimple,
  onMakeComplex,
  onRequestFullReview,
}: QuickTaskCardProps) => {
  const [showEditPanel, setShowEditPanel] = useState(false);
  const { data: areas } = useAreas();
  const confirmMutation = useConfirmParse();

  const item = result.items[0];

  const findAreaId = useMemo(
    () => (name?: string | null) => {
      if (!name || !areas) return null;
      const lower = name.toLowerCase();
      return areas.find((a) => a.name.toLowerCase() === lower)?.id ?? null;
    },
    [areas],
  );

  const handleReanalyzeSubmit = (correction: string) => {
    onReanalyze(correction);
    setShowEditPanel(false);
  };

  if (!item) return null;

  const buildTaskPayload = (): CreateTaskInput => {
    const areaId = findAreaId(item.area) ?? null;
    const priority: Priority = item.priority ?? 'medium';
    return {
      title: item.title,
      description: item.summary ?? undefined,
      priority,
      areaId,
      source: 'ai',
      reason: item.summary ?? undefined,
    };
  };

  const handleQuickAdd = async () => {
    await confirmMutation.mutateAsync({ tasks: [buildTaskPayload()] });
    onConfirmed?.();
    onClose();
  };

  const hasTaskLikeInput = result.items.some((i) => i.kind === 'task');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
    >
      <GlassCard variant="cyan" glow className="p-4 md:p-5" data-test-id="quick-task-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
              <Zap size={12} />
              Quick task detected
              {wasCorrected && (
                <StatusBadge tone="cyan" data-test-id="quick-task-corrected-badge">
                  Corrected
                </StatusBadge>
              )}
            </div>
            <p className="mt-2 text-sm text-text-soft">
              You wrote: <span className="text-text-main">"{rawInput}"</span>
            </p>
            {result.navigatorMessage && (
              <p className="mt-1 text-sm text-text-main">{result.navigatorMessage}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-text-soft hover:bg-white/5 hover:text-text-main"
            aria-label="Dismiss"
            data-test-id="quick-task-dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-border-accent-strong bg-cyan/5 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="muted">
              <span className="inline-flex items-center gap-1">
                <ListPlus size={14} />
                task
              </span>
            </StatusBadge>
            {item.area && <StatusBadge tone="cyan">{item.area}</StatusBadge>}
            {item.priority && (
              <StatusBadge
                tone={
                  item.priority === 'critical' || item.priority === 'high' ? 'amber' : 'muted'
                }
              >
                {item.priority}
              </StatusBadge>
            )}
          </div>
          <div className="mt-2 text-base font-medium text-text-main">{item.title}</div>
          {item.summary && <p className="mt-1 text-xs text-text-soft">{item.summary}</p>}
        </div>

        {hasTaskLikeInput && (
          <div className="mt-3">
            <TaskComplexityToggle
              isSimpleTask={result.isSimpleTask}
              isPending={isPending}
              disabled={showEditPanel}
              onMakeSimple={onMakeSimple}
              onMakeComplex={onMakeComplex}
            />
          </div>
        )}

        {showEditPanel && (
          <ReanalyzePanel
            isPending={isPending}
            onSubmit={handleReanalyzeSubmit}
            onCancel={() => setShowEditPanel(false)}
          />
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <GlowButton
            variant="ghost"
            leftIcon={<Pencil size={14} />}
            onClick={() => setShowEditPanel(true)}
            disabled={isPending || showEditPanel}
            data-test-id="quick-task-reanalyze-open"
          >
            Re-analyze
          </GlowButton>
          <GlowButton
            variant="ghost"
            onClick={onRequestFullReview}
            disabled={isPending}
            data-test-id="quick-task-review"
          >
            Review
          </GlowButton>
          <GlowButton
            leftIcon={<Check size={14} />}
            onClick={handleQuickAdd}
            loading={confirmMutation.isPending}
            disabled={isPending}
            data-test-id="quick-task-add"
          >
            Quick Add
          </GlowButton>
        </div>
      </GlassCard>
    </motion.div>
  );
};
