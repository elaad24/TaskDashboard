import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Check,
  X,
  Brain,
  ListPlus,
  BookOpen,
  AlertCircle,
  Wallet,
  FileText,
  Pencil,
  ChevronDown,
} from 'lucide-react';
import type {
  ConfirmParseInput,
  CreateLogInput,
  CreateProblemInput,
  CreateStudyTopicInput,
  CreateTaskInput,
  ParseResponse,
  ParsedItem,
  ParsedItemKind,
  Priority,
} from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useConfirmParse } from '@/hooks/useNavigator';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAreas } from '@/hooks/useAreas';
import { ReanalyzePanel } from '@/components/command/ReanalyzePanel';
import { TaskComplexityToggle } from '@/components/command/TaskComplexityToggle';
import { hasComplexityToggleInput } from '@/lib/taskComplexityCorrections';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KIND_OPTIONS: Array<ParsedItemKind> = [
  'task',
  'goal',
  'problem',
  'expense',
  'note',
  'study_weakness',
  'resource',
  'decision',
];

const PRIORITY_OPTIONS: Array<Priority> = ['low', 'medium', 'high', 'critical'];

// ---------------------------------------------------------------------------
// Local edit state shape — one entry per item index
// ---------------------------------------------------------------------------

type ItemEdit = {
  title?: string;
  summary?: string | null;
  kind?: ParsedItemKind;
  area?: string | null;
  priority?: Priority;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const kindIcon = (kind: ParsedItemKind) => {
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

const kindTone = (kind: ParsedItemKind): 'amber' | 'neon' | 'cyan' | 'muted' =>
  kind === 'problem' || kind === 'study_weakness'
    ? 'amber'
    : kind === 'expense'
    ? 'neon'
    : kind === 'goal'
    ? 'cyan'
    : 'muted';

const priorityTone = (p?: Priority | null): 'amber' | 'muted' =>
  p === 'critical' || p === 'high' ? 'amber' : 'muted';

// ---------------------------------------------------------------------------
// EditableText — click-to-edit inline field
// ---------------------------------------------------------------------------

type EditableTextProps = {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
};

const EditableText = ({ value, onChange, multiline = false, placeholder, className }: EditableTextProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      textareaRef.current?.focus();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    // Don't allow saving an empty title; revert instead
    if (trimmed) onChange(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cancel();
    }
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      commit();
    }
  };

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        title="Click to edit"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setEditing(true);
          }
        }}
        className={cn(
          'cursor-text rounded px-0.5 outline-none transition-colors hover:bg-white/5 focus-visible:ring-1 focus-visible:ring-border-accent',
          !value && 'italic text-text-muted',
          className,
        )}
      >
        {value || placeholder}
      </span>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className={cn(
          'w-full resize-none rounded border border-border-accent bg-bg-deep/80 px-2 py-1 text-xs text-text-main placeholder:text-text-muted focus:outline-none',
          className,
        )}
        data-test-id="editable-summary"
      />
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      placeholder={placeholder}
      className={cn(
        'w-full rounded border border-border-accent bg-bg-deep/80 px-2 py-1 text-sm font-medium text-text-main placeholder:text-text-muted focus:outline-none',
        className,
      )}
      data-test-id="editable-title"
    />
  );
};

// ---------------------------------------------------------------------------
// ClickableBadge — badge that opens a Radix dropdown
// ---------------------------------------------------------------------------

type ClickableBadgeOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

type ClickableBadgeProps<T extends string> = {
  tone?: 'cyan' | 'neon' | 'amber' | 'muted';
  children: React.ReactNode;
  options: Array<ClickableBadgeOption<T>>;
  onSelect: (value: T) => void;
  'data-test-id'?: string;
};

const ClickableBadge = <T extends string>({
  tone = 'muted',
  children,
  options,
  onSelect,
  'data-test-id': testId,
}: ClickableBadgeProps<T>) => {
  const toneClasses: Record<string, string> = {
    cyan: 'bg-cyan/10 text-cyan-200 border-border-pill hover:bg-cyan/20',
    neon: 'bg-neon/10 text-neon border-border-pill-neon hover:bg-neon/20',
    amber: 'bg-amber/10 text-amber-400 border-border-pill-amber hover:bg-amber/20',
    muted: 'bg-white/5 text-text-soft border-border-subtle hover:bg-white/10',
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          data-test-id={testId}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-border-accent',
            toneClasses[tone] ?? toneClasses.muted,
          )}
        >
          {children}
          <ChevronDown size={9} className="opacity-60" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="start"
          onClick={(e) => e.stopPropagation()}
          className="z-50 min-w-[140px] overflow-hidden rounded-xl border border-border-subtle bg-bg-soft p-1 shadow-glass-lg"
        >
          {options.map((opt) => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => onSelect(opt.value)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-text-main outline-none transition-colors data-[highlighted]:bg-white/10"
            >
              {opt.icon && <span className="text-text-soft">{opt.icon}</span>}
              <span>{opt.label}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

// ---------------------------------------------------------------------------
// AIRecommendationCard
// ---------------------------------------------------------------------------

type AIRecommendationCardProps = {
  result: ParseResponse;
  rawInput: string;
  onClose: () => void;
  onConfirmed?: () => void;
  wasCorrected: boolean;
  isPending: boolean;
  onReanalyze: (correction: string) => void;
  onMakeSimple: () => void;
  onMakeComplex: () => void;
};

export const AIRecommendationCard = ({
  result,
  rawInput,
  onClose,
  onConfirmed,
  wasCorrected,
  isPending,
  onReanalyze,
  onMakeSimple,
  onMakeComplex,
}: AIRecommendationCardProps) => {
  const { data: areas } = useAreas();
  const confirmMutation = useConfirmParse();
  const [showEditPanel, setShowEditPanel] = useState(false);

  // Which items the user selected to create
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(result.items.map((_, i) => i)),
  );

  // Manual edits per item — keyed by item index
  const [itemEdits, setItemEdits] = useState<Map<number, ItemEdit>>(new Map());

  // Reset all local state whenever the AI result changes (re-analyze happened)
  useEffect(() => {
    setSelected(new Set(result.items.map((_, i) => i)));
    setShowEditPanel(false);
    setItemEdits(new Map());
  }, [result]);

  const hasTaskLikeInput = hasComplexityToggleInput(result.items);

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const updateEdit = (i: number, patch: Partial<ItemEdit>) => {
    setItemEdits((prev) => {
      const next = new Map(prev);
      next.set(i, { ...(next.get(i) ?? {}), ...patch });
      return next;
    });
  };

  // Merge AI result with any local manual edits
  const getMergedItem = (item: ParsedItem, i: number): ParsedItem => ({
    ...item,
    ...(itemEdits.get(i) ?? {}),
  });

  const findAreaId = useMemo(
    () => (name?: string | null) => {
      if (!name || !areas) return null;
      const lower = name.toLowerCase();
      return areas.find((a) => a.name.toLowerCase() === lower)?.id ?? null;
    },
    [areas],
  );

  // Build the area options list for the dropdown
  const areaOptions = useMemo(
    () => [
      { value: '' as string, label: 'None' },
      ...(areas ?? []).map((a) => ({ value: a.name, label: a.name })),
    ],
    [areas],
  );

  const kindOptions = KIND_OPTIONS.map((k) => ({
    value: k,
    label: k.replace('_', ' '),
    icon: kindIcon(k),
  }));

  const priorityOptions = PRIORITY_OPTIONS.map((p) => ({
    value: p,
    label: p,
  }));

  const buildPayload = (): ConfirmParseInput => {
    const tasks: Array<CreateTaskInput> = [];
    const problems: Array<CreateProblemInput> = [];
    const studyTopics: Array<CreateStudyTopicInput> = [];
    const logs: Array<CreateLogInput> = [];

    result.items.forEach((rawItem, i) => {
      if (!selected.has(i)) return;

      // Apply any manual edits the user made before confirming
      const item = getMergedItem(rawItem, i);
      const areaId = findAreaId(item.area) ?? null;
      const priority: Priority = item.priority ?? 'medium';

      if (item.kind === 'task') {
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
          occurredAt: item.occurredAt ?? undefined,
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

  const handleReanalyzeSubmit = (correction: string) => {
    onReanalyze(correction);
    setShowEditPanel(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
    >
      <GlassCard variant="cyan" glow className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
              <Brain size={12} />
              Navigator interpretation
              {wasCorrected && (
                <StatusBadge tone="cyan" data-test-id="ai-corrected-badge">
                  Corrected
                </StatusBadge>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-text-soft">
              You wrote: <span className="text-text-main">"{rawInput}"</span>
            </p>
            {result.navigatorMessage && (
              <p className="mt-2 max-w-2xl text-sm text-text-main">{result.navigatorMessage}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-text-soft hover:bg-white/5 hover:text-text-main"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* Complexity toggle */}
        {hasTaskLikeInput && (
          <div className="mt-4">
            <TaskComplexityToggle
              isSimpleTask={result.isSimpleTask}
              isPending={isPending}
              disabled={showEditPanel}
              onMakeSimple={onMakeSimple}
              onMakeComplex={onMakeComplex}
            />
          </div>
        )}

        {/* Re-analyze panel */}
        {showEditPanel && (
          <ReanalyzePanel
            isPending={isPending}
            onSubmit={handleReanalyzeSubmit}
            onCancel={() => setShowEditPanel(false)}
          />
        )}

        {/* Item list */}
        <ul className="mt-5 space-y-3" aria-label="Detected items">
          {result.items.map((rawItem, i) => {
            const item = getMergedItem(rawItem, i);
            const isSelected = selected.has(i);

            return (
              <li key={i}>
                {/*
                 * Changed from <label> to <div> because the item now contains
                 * multiple interactive elements (inputs, dropdowns). Putting a
                 * <label> around inputs would cause every click to fire twice.
                 */}
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 transition-all',
                    isSelected
                      ? 'border-border-accent-strong bg-cyan/5'
                      : 'border-border-subtle bg-white/[0.02] hover:border-border-accent',
                  )}
                >
                  {/* Checkbox */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      id={`ai-item-${i}`}
                      checked={isSelected}
                      onChange={() => toggle(i)}
                      className="h-4 w-4 cursor-pointer rounded border-border-subtle bg-bg-deep accent-cyan"
                      data-test-id={`ai-item-checkbox-${i}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Editable badge row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Type / kind */}
                      <ClickableBadge
                        tone={kindTone(item.kind)}
                        options={kindOptions}
                        onSelect={(k) => updateEdit(i, { kind: k })}
                        data-test-id={`ai-item-kind-${i}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {kindIcon(item.kind)}
                          {item.kind.replace('_', ' ')}
                        </span>
                      </ClickableBadge>

                      {/* Area / category */}
                      <ClickableBadge
                        tone="cyan"
                        options={areaOptions}
                        onSelect={(v) => updateEdit(i, { area: v || null })}
                        data-test-id={`ai-item-area-${i}`}
                      >
                        {item.area ?? 'No area'}
                      </ClickableBadge>

                      {/* Priority / urgency */}
                      {item.priority && (
                        <ClickableBadge
                          tone={priorityTone(item.priority)}
                          options={priorityOptions}
                          onSelect={(p) => updateEdit(i, { priority: p })}
                          data-test-id={`ai-item-priority-${i}`}
                        >
                          {item.priority}
                        </ClickableBadge>
                      )}
                    </div>

                    {/* Editable title */}
                    <div className="mt-2">
                      <EditableText
                        value={item.title}
                        onChange={(v) => updateEdit(i, { title: v })}
                        placeholder="Task title"
                        className="text-sm font-medium text-text-main"
                      />
                    </div>

                    {/* Editable summary / description */}
                    <div className="mt-1">
                      <EditableText
                        value={item.summary ?? ''}
                        onChange={(v) => updateEdit(i, { summary: v })}
                        multiline
                        placeholder="Add a description… (click to edit)"
                        className="text-xs text-text-soft"
                      />
                    </div>

                    {item.kind === 'expense' && (item.costAmount != null || item.occurredAt) && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-muted">
                        {item.costAmount != null && (
                          <span className="text-neon">
                            {formatCurrency(item.costAmount, item.costCurrency ?? 'EUR')}
                          </span>
                        )}
                        {item.occurredAt && <span>{formatDate(item.occurredAt)}</span>}
                      </div>
                    )}

                    {/* Suggested sub-tasks (read-only) */}
                    {item.suggestedTasks && item.suggestedTasks.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-l border-border-card pl-3">
                        {item.suggestedTasks.map((st, j) => (
                          <li key={j} className="text-xs text-text-soft">
                            <span className="text-text-main">{st.title}</span>
                            {st.estimatedMinutes ? (
                              <span className="text-text-muted"> — {st.estimatedMinutes} min</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Follow-up question */}
                    {item.followUpQuestion && (
                      <div className="mt-2 text-xs text-amber-400">
                        Follow-up: {item.followUpQuestion}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Footer actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-text-muted">
            {selected.size} of {result.items.length} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GlowButton variant="ghost" onClick={onClose}>
              Ignore
            </GlowButton>
            <GlowButton
              variant="ghost"
              leftIcon={<Pencil size={14} />}
              onClick={() => setShowEditPanel(true)}
              disabled={isPending || showEditPanel}
              data-test-id="ai-reanalyze-open"
            >
              Re-analyze
            </GlowButton>
            <GlowButton
              variant="subtle"
              onClick={() => setSelected(new Set(result.items.map((_, i) => i)))}
              disabled={isPending}
            >
              Select all
            </GlowButton>
            <GlowButton
              leftIcon={<Check size={14} />}
              onClick={handleConfirm}
              loading={confirmMutation.isPending}
              disabled={selected.size === 0 || isPending}
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
