import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Brain, ListPlus, BookOpen, AlertCircle, Wallet, FileText } from 'lucide-react';
import type {
  ConfirmParseInput,
  CreateLogInput,
  CreateProblemInput,
  CreateStudyTopicInput,
  CreateTaskInput,
  ParseResponse,
  ParsedItem,
  Priority,
} from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useConfirmParse } from '@/hooks/useNavigator';
import { useAreas } from '@/hooks/useAreas';
import { cn } from '@/lib/cn';

type AIRecommendationCardProps = {
  result: ParseResponse;
  rawInput: string;
  onClose: () => void;
  onConfirmed?: () => void;
};

const kindIcon = (kind: ParsedItem['kind']) => {
  switch (kind) {
    case 'task':
      return <ListPlus size={14} />;
    case 'goal':
      return <Brain size={14} />;
    case 'problem':
    case 'study_weakness':
      return <AlertCircle size={14} />;
    case 'expense':
      return <Wallet size={14} />;
    case 'resource':
      return <BookOpen size={14} />;
    case 'note':
    case 'decision':
    default:
      return <FileText size={14} />;
  }
};

const kindTone = (kind: ParsedItem['kind']) =>
  kind === 'problem' || kind === 'study_weakness'
    ? 'amber'
    : kind === 'expense'
    ? 'neon'
    : kind === 'goal'
    ? 'cyan'
    : 'muted';

export const AIRecommendationCard = ({
  result,
  rawInput,
  onClose,
  onConfirmed,
}: AIRecommendationCardProps) => {
  const { data: areas } = useAreas();
  const confirmMutation = useConfirmParse();
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(result.items.map((_, i) => i)),
  );

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const findAreaId = useMemo(
    () => (name?: string | null) => {
      if (!name || !areas) return null;
      const lower = name.toLowerCase();
      return areas.find((a) => a.name.toLowerCase() === lower)?.id ?? null;
    },
    [areas],
  );

  const buildPayload = (): ConfirmParseInput => {
    const tasks: Array<CreateTaskInput> = [];
    const problems: Array<CreateProblemInput> = [];
    const studyTopics: Array<CreateStudyTopicInput> = [];
    const logs: Array<CreateLogInput> = [];

    result.items.forEach((item, i) => {
      if (!selected.has(i)) return;
      const areaId = findAreaId(item.area) ?? null;
      const priority: Priority = item.priority ?? 'medium';

      if (item.kind === 'task') {
        // For pure "task" kind we expect 1 main task. Use suggestedTasks as
        // detail bullets in description if present.
        const main = item.suggestedTasks?.[0];
        if (main) {
          for (const st of item.suggestedTasks ?? []) {
            tasks.push({
              title: st.title,
              description: st.description ?? undefined,
              priority: (st.priority ?? priority) as Priority,
              estimatedMinutes: st.estimatedMinutes ?? undefined,
              areaId,
              source: 'ai',
              reason: st.reason ?? item.summary ?? undefined,
            });
          }
        } else {
          tasks.push({
            title: item.title,
            description: item.summary ?? undefined,
            priority,
            areaId,
            source: 'ai',
            reason: item.summary ?? undefined,
          });
        }
      } else if (item.kind === 'problem' || item.kind === 'study_weakness') {
        problems.push({
          title: item.title,
          description: item.summary ?? undefined,
          areaId,
          priority,
          status: 'planning',
          aiInterpretation: item.summary ?? undefined,
          suggestedPlan: item.suggestedTasks
            ? JSON.stringify(item.suggestedTasks.map((t) => t.title))
            : undefined,
        });
        for (const st of item.suggestedTasks ?? []) {
          tasks.push({
            title: st.title,
            description: st.description ?? undefined,
            priority: (st.priority ?? priority) as Priority,
            estimatedMinutes: st.estimatedMinutes ?? undefined,
            areaId,
            source: 'ai',
            reason: st.reason ?? `Solves: ${item.title}`,
          });
        }
        if (item.kind === 'study_weakness') {
          studyTopics.push({
            subject: item.area ?? 'Study',
            topic: item.title,
            confidence: 'low',
            weakTopics: [],
            areaId,
          });
        }
      } else if (item.kind === 'expense') {
        logs.push({
          title: item.title,
          content: item.summary ?? undefined,
          kind: 'expense',
          areaId,
          costAmount: item.costAmount ?? undefined,
          costCurrency: item.costCurrency ?? 'EUR',
        });
      } else if (item.kind === 'note' || item.kind === 'decision') {
        logs.push({
          title: item.title,
          content: item.summary ?? undefined,
          kind: item.kind === 'decision' ? 'decision' : 'note',
          areaId,
        });
      }
    });

    return { tasks, problems, studyTopics, logs };
  };

  const handleConfirm = async () => {
    const payload = buildPayload();
    await confirmMutation.mutateAsync(payload);
    onConfirmed?.();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
    >
      <GlassCard variant="cyan" glow className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
              <Brain size={12} />
              Navigator interpretation
            </div>
            <p className="mt-2 max-w-2xl text-sm text-text-soft">
              You wrote: <span className="text-text-main">"{rawInput}"</span>
            </p>
            {result.navigatorMessage && (
              <p className="mt-2 max-w-2xl text-sm text-text-main">{result.navigatorMessage}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-text-soft hover:bg-white/5 hover:text-text-main"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <ul className="mt-5 space-y-3" aria-label="Detected items">
          {result.items.map((item, i) => {
            const isSelected = selected.has(i);
            return (
              <li key={i}>
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all',
                    isSelected
                      ? 'border-border-accent-strong bg-cyan/5'
                      : 'border-border-subtle bg-white/[0.02] hover:border-border-accent',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(i)}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-border-subtle bg-bg-deep accent-cyan"
                    data-test-id={`ai-item-checkbox-${i}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={kindTone(item.kind)} dot>
                        <span className="inline-flex items-center gap-1">
                          {kindIcon(item.kind)}
                          {item.kind.replace('_', ' ')}
                        </span>
                      </StatusBadge>
                      {item.area && <StatusBadge tone="cyan">{item.area}</StatusBadge>}
                      {item.priority && (
                        <StatusBadge
                          tone={
                            item.priority === 'critical' || item.priority === 'high'
                              ? 'amber'
                              : 'muted'
                          }
                        >
                          {item.priority}
                        </StatusBadge>
                      )}
                    </div>
                    <div className="mt-2 text-sm font-medium text-text-main">{item.title}</div>
                    {item.summary && (
                      <p className="mt-1 text-xs text-text-soft">{item.summary}</p>
                    )}
                    {item.suggestedTasks && item.suggestedTasks.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-l border-border-card pl-3">
                        {item.suggestedTasks.map((st, j) => (
                          <li key={j} className="text-xs text-text-soft">
                            <span className="text-text-main">{st.title}</span>
                            {st.estimatedMinutes ? (
                              <span className="text-text-muted"> -- {st.estimatedMinutes} min</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.followUpQuestion && (
                      <div className="mt-2 text-xs text-amber-400">
                        Follow-up: {item.followUpQuestion}
                      </div>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-text-muted">
            {selected.size} of {result.items.length} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GlowButton variant="ghost" onClick={onClose}>
              Ignore
            </GlowButton>
            <GlowButton
              variant="subtle"
              onClick={() => setSelected(new Set(result.items.map((_, i) => i)))}
            >
              Select all
            </GlowButton>
            <GlowButton
              leftIcon={<Check size={14} />}
              onClick={handleConfirm}
              loading={confirmMutation.isPending}
              disabled={selected.size === 0}
              data-test-id="ai-confirm-create"
            >
              Create selected
            </GlowButton>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};
