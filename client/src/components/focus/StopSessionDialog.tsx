import { useEffect, useState } from 'react';
import type {
  CreateFocusSessionInput,
  FocusActivityType,
  FocusLinkMode,
  FocusSuggestResponse,
} from '@command-center/shared';
import { isLearningActivityType } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCreateFocusSession, useSuggestFocusLinks } from '@/hooks/useFocus';
import { clearActiveFocusSession, FOCUS_ACTIVITY_OPTIONS, formatElapsed } from '@/lib/focusTimer';
import { cn } from '@/lib/cn';

type StopSessionDialogProps = {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  onClose: () => void;
  onSaved: () => void;
};

type Step = 'details' | 'link';
type LinkSelection =
  | { kind: 'existing_topic'; id: string }
  | { kind: 'task'; id: string }
  | { kind: 'goal'; id: string }
  | { kind: 'new_topic' }
  | { kind: 'none' };

const inputClass =
  'mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none';

const radioClass = (selected: boolean) =>
  cn(
    'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
    selected
      ? 'border-border-accent-strong bg-cyan/10'
      : 'border-border-subtle bg-white/[0.02] hover:border-border-accent',
  );

export const StopSessionDialog = ({
  startedAt,
  endedAt,
  durationSeconds,
  onClose,
  onSaved,
}: StopSessionDialogProps) => {
  const createSession = useCreateFocusSession();
  const suggestLinks = useSuggestFocusLinks();
  const toast = useToast();

  const [step, setStep] = useState<Step>('details');
  const [activityType, setActivityType] = useState<FocusActivityType>('study');
  const [description, setDescription] = useState('');
  const [stopReason, setStopReason] = useState('');
  const [suggestions, setSuggestions] = useState<FocusSuggestResponse | null>(null);
  const [selection, setSelection] = useState<LinkSelection>({ kind: 'none' });
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const buildPayload = (): CreateFocusSessionInput => {
    const trimmedDescription = description.trim();
    const trimmedReason = stopReason.trim();
    const base: CreateFocusSessionInput = {
      activityType,
      description: trimmedDescription,
      startedAt,
      endedAt,
      durationSeconds,
      stopReason: trimmedReason,
      linkMode: 'none',
    };

    if (!isLearningActivityType(activityType)) {
      return base;
    }

    switch (selection.kind) {
      case 'existing_topic':
        return { ...base, linkMode: 'existing_topic', studyTopicId: selection.id };
      case 'task':
        return { ...base, linkMode: 'task', taskId: selection.id };
      case 'goal':
        return { ...base, linkMode: 'goal', goalId: selection.id };
      case 'new_topic':
        return {
          ...base,
          linkMode: 'new_topic',
          newTopic: {
            subject: newSubject.trim(),
            topic: newTopic.trim(),
            areaId: suggestions?.proposedTopic?.areaId ?? null,
          },
        };
      case 'none':
      default:
        return { ...base, linkMode: 'none' };
    }
  };

  const handleSave = async () => {
    const trimmedDescription = description.trim();
    const trimmedReason = stopReason.trim();

    if (!trimmedDescription) {
      toast.showError('Description required', 'Please describe what you were doing.');
      return;
    }
    if (!trimmedReason) {
      toast.showError('Reason required', 'Please describe why you stopped.');
      return;
    }
    if (selection.kind === 'new_topic' && (!newSubject.trim() || !newTopic.trim())) {
      toast.showError('Topic required', 'Please enter a subject and topic name.');
      return;
    }

    try {
      await createSession.mutateAsync(buildPayload());
      clearActiveFocusSession();
      toast.showSuccess('Session saved', 'Your focus session was logged.');
      onSaved();
    } catch (error) {
      toast.showError(
        'Could not save session',
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const handleNext = async () => {
    const trimmedDescription = description.trim();
    const trimmedReason = stopReason.trim();

    if (!trimmedDescription) {
      toast.showError('Description required', 'Please describe what you were doing.');
      return;
    }
    if (!trimmedReason) {
      toast.showError('Reason required', 'Please describe why you stopped.');
      return;
    }

    if (!isLearningActivityType(activityType)) {
      await handleSave();
      return;
    }

    setStep('link');
    try {
      const result = await suggestLinks.mutateAsync({
        description: trimmedDescription,
        activityType,
      });
      setSuggestions(result);

      if (result.candidateTopics[0]) {
        setSelection({ kind: 'existing_topic', id: result.candidateTopics[0].id });
      } else if (result.candidateTasks[0]) {
        setSelection({ kind: 'task', id: result.candidateTasks[0].id });
      } else if (result.candidateGoals[0]) {
        setSelection({ kind: 'goal', id: result.candidateGoals[0].id });
      } else if (result.proposedTopic) {
        setSelection({ kind: 'new_topic' });
        setNewSubject(result.proposedTopic.subject);
        setNewTopic(result.proposedTopic.topic);
      } else {
        setSelection({ kind: 'none' });
      }
    } catch (error) {
      toast.showError(
        'Could not load suggestions',
        error instanceof Error ? error.message : undefined,
      );
      setStep('details');
    }
  };

  const handleSelect = (next: LinkSelection) => {
    setSelection(next);
    if (next.kind === 'new_topic' && suggestions?.proposedTopic) {
      setNewSubject(suggestions.proposedTopic.subject);
      setNewTopic(suggestions.proposedTopic.topic);
    }
  };

  const isSelected = (mode: FocusLinkMode, id?: string): boolean => {
    if (mode === 'existing_topic' && selection.kind === 'existing_topic') {
      return selection.id === id;
    }
    if (mode === 'task' && selection.kind === 'task') return selection.id === id;
    if (mode === 'goal' && selection.kind === 'goal') return selection.id === id;
    if (mode === 'new_topic' && selection.kind === 'new_topic') return true;
    if (mode === 'none' && selection.kind === 'none') return true;
    return false;
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="stop-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-test-id="stop-session-dialog"
    >
      <GlassCard variant="neon" glow className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-neon">
          {step === 'details' ? 'End session' : 'Link to your work'}
        </div>
        <h3 id="stop-session-title" className="mt-1.5 text-base font-semibold text-text-main">
          You focused for {formatElapsed(durationSeconds)}
        </h3>
        <p className="mt-1 text-xs text-text-soft">
          {step === 'details'
            ? 'Tell us what you did and why you stopped. Learning sessions will be linked to your study topics and logs.'
            : 'Was this session for one of these? Pick the closest match or create something new.'}
        </p>

        {step === 'details' ? (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs text-text-muted">Activity type</span>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as FocusActivityType)}
                className={inputClass}
                data-test-id="stop-session-activity-select"
              >
                {FOCUS_ACTIVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-text-muted">What did you do / learn?</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g. React hooks chapter 3, morning run, cooked dinner"
                maxLength={8000}
                spellCheck
                autoCorrect="on"
                autoCapitalize="sentences"
                className={inputClass}
                data-test-id="stop-session-description-input"
              />
            </label>

            <label className="block">
              <span className="text-xs text-text-muted">Why did you stop?</span>
              <textarea
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                rows={3}
                placeholder="e.g. checked Instagram, went to restroom, got a call"
                maxLength={500}
                spellCheck
                autoCorrect="on"
                autoCapitalize="sentences"
                className={inputClass}
                data-test-id="stop-session-reason-input"
              />
            </label>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {suggestLinks.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                {suggestions?.candidateTopics.map((topic) => (
                  <label
                    key={topic.id}
                    className={radioClass(isSelected('existing_topic', topic.id))}
                    data-test-id={`stop-session-topic-${topic.id}`}
                  >
                    <input
                      type="radio"
                      name="focus-link"
                      className="mt-1"
                      checked={isSelected('existing_topic', topic.id)}
                      onChange={() => handleSelect({ kind: 'existing_topic', id: topic.id })}
                    />
                    <span>
                      <span className="block text-sm text-text-main">
                        {topic.subject} — {topic.topic}
                      </span>
                      <span className="text-xs text-text-muted">{topic.reason}</span>
                    </span>
                  </label>
                ))}

                {suggestions?.candidateTasks.map((task) => (
                  <label
                    key={task.id}
                    className={radioClass(isSelected('task', task.id))}
                    data-test-id={`stop-session-task-${task.id}`}
                  >
                    <input
                      type="radio"
                      name="focus-link"
                      className="mt-1"
                      checked={isSelected('task', task.id)}
                      onChange={() => handleSelect({ kind: 'task', id: task.id })}
                    />
                    <span>
                      <span className="block text-sm text-text-main">Task: {task.title}</span>
                    </span>
                  </label>
                ))}

                {suggestions?.candidateGoals.map((goal) => (
                  <label
                    key={goal.id}
                    className={radioClass(isSelected('goal', goal.id))}
                    data-test-id={`stop-session-goal-${goal.id}`}
                  >
                    <input
                      type="radio"
                      name="focus-link"
                      className="mt-1"
                      checked={isSelected('goal', goal.id)}
                      onChange={() => handleSelect({ kind: 'goal', id: goal.id })}
                    />
                    <span>
                      <span className="block text-sm text-text-main">Goal: {goal.title}</span>
                    </span>
                  </label>
                ))}

                <label
                  className={radioClass(isSelected('new_topic'))}
                  data-test-id="stop-session-new-topic"
                >
                  <input
                    type="radio"
                    name="focus-link"
                    className="mt-1"
                    checked={isSelected('new_topic')}
                    onChange={() => handleSelect({ kind: 'new_topic' })}
                  />
                  <span className="w-full">
                    <span className="block text-sm text-text-main">Something new</span>
                    {selection.kind === 'new_topic' && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          placeholder="Subject"
                          className={inputClass}
                          data-test-id="stop-session-new-subject"
                        />
                        <input
                          type="text"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          placeholder="Topic"
                          className={inputClass}
                          data-test-id="stop-session-new-topic-name"
                        />
                      </div>
                    )}
                  </span>
                </label>

                <label
                  className={radioClass(isSelected('none'))}
                  data-test-id="stop-session-no-link"
                >
                  <input
                    type="radio"
                    name="focus-link"
                    className="mt-1"
                    checked={isSelected('none')}
                    onChange={() => handleSelect({ kind: 'none' })}
                  />
                  <span className="text-sm text-text-main">Don't link — just log the time</span>
                </label>
              </>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <GlowButton variant="ghost" onClick={onClose} data-test-id="stop-session-cancel">
            Cancel
          </GlowButton>
          {step === 'link' && (
            <GlowButton variant="ghost" onClick={() => setStep('details')} data-test-id="stop-session-back">
              Back
            </GlowButton>
          )}
          {step === 'details' ? (
            <GlowButton
              loading={suggestLinks.isPending || createSession.isPending}
              onClick={handleNext}
              data-test-id="stop-session-next"
            >
              {isLearningActivityType(activityType) ? 'Next' : 'Save session'}
            </GlowButton>
          ) : (
            <GlowButton
              loading={createSession.isPending}
              onClick={handleSave}
              data-test-id="stop-session-save"
            >
              Save session
            </GlowButton>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
