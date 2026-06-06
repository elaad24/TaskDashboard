import { useEffect, useState } from 'react';
import type { Priority, Problem, ProblemStatus } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { useToast } from '@/components/ui/Toast';
import { useUpdateProblem } from '@/hooks/useProblems';

type EditProblemModalProps = {
  problem: Problem | null;
  onClose: () => void;
};

const inputClass =
  'mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none';

const PRIORITIES: Array<Priority> = ['low', 'medium', 'high', 'critical'];
const STATUSES: Array<ProblemStatus> = ['open', 'planning', 'resolved'];

export const EditProblemModal = ({ problem, onClose }: EditProblemModalProps) => {
  const updateProblem = useUpdateProblem();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProblemStatus>('open');
  const [priority, setPriority] = useState<Priority>('medium');

  useEffect(() => {
    if (!problem) return;
    setTitle(problem.title);
    setDescription(problem.description ?? '');
    setStatus(problem.status);
    setPriority(problem.priority);
  }, [problem]);

  useEffect(() => {
    if (!problem) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [problem, onClose]);

  if (!problem) return null;

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.showError('Title required', 'Please enter a problem title.');
      return;
    }

    try {
      await updateProblem.mutateAsync({
        id: problem.id,
        input: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          status,
          priority,
        },
      });
      toast.showSuccess('Problem updated', trimmedTitle);
      onClose();
    } catch (error) {
      toast.showError(
        'Could not update problem',
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="edit-problem-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-test-id="edit-problem-modal"
    >
      <GlassCard variant="neon" glow className="w-full max-w-lg p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-neon">Edit problem</div>
        <h3 id="edit-problem-title" className="mt-1.5 text-base font-semibold text-text-main">
          {problem.title}
        </h3>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs text-text-muted">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              data-test-id="edit-problem-title-input"
            />
          </label>

          <label className="block">
            <span className="text-xs text-text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
              data-test-id="edit-problem-description-input"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-text-muted">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProblemStatus)}
                className={inputClass}
                data-test-id="edit-problem-status-select"
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-text-muted">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={inputClass}
                data-test-id="edit-problem-priority-select"
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <GlowButton variant="ghost" onClick={onClose} data-test-id="edit-problem-cancel">
            Cancel
          </GlowButton>
          <GlowButton
            loading={updateProblem.isPending}
            onClick={handleSave}
            data-test-id="edit-problem-save"
          >
            Save changes
          </GlowButton>
        </div>
      </GlassCard>
    </div>
  );
};
