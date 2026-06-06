import { useEffect, useState } from 'react';
import type { Priority, Task, TaskStatus } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { useToast } from '@/components/ui/Toast';
import { useAreas } from '@/hooks/useAreas';
import { useUpdateTask } from '@/hooks/useTasks';

type EditTaskModalProps = {
  task: Task | null;
  onClose: () => void;
};

const inputClass =
  'mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none';

const PRIORITIES: Array<Priority> = ['low', 'medium', 'high', 'critical'];
const STATUSES: Array<TaskStatus> = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'];
const SCALE_VALUES = [1, 2, 3, 4, 5] as const;

export const EditTaskModal = ({ task, onClose }: EditTaskModalProps) => {
  const updateTask = useUpdateTask();
  const toast = useToast();
  const { data: areas } = useAreas();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [urgency, setUrgency] = useState(3);
  const [importance, setImportance] = useState(3);
  const [effort, setEffort] = useState(3);
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [areaId, setAreaId] = useState<string>('');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setStatus(task.status);
    setUrgency(task.urgency);
    setImportance(task.importance);
    setEffort(task.effort);
    setEstimatedMinutes(task.estimatedMinutes != null ? String(task.estimatedMinutes) : '');
    setAreaId(task.areaId ?? '');
  }, [task]);

  useEffect(() => {
    if (!task) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [task, onClose]);

  if (!task) return null;

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.showError('Title required', 'Please enter a task title.');
      return;
    }

    const parsedMinutes = estimatedMinutes.trim() ? Number(estimatedMinutes) : null;
    if (parsedMinutes !== null && (Number.isNaN(parsedMinutes) || parsedMinutes < 0)) {
      toast.showError('Invalid estimate', 'Estimated minutes must be a positive number.');
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: task.id,
        input: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority,
          status,
          urgency,
          importance,
          effort,
          estimatedMinutes: parsedMinutes ?? undefined,
          areaId: areaId || null,
        },
      });
      toast.showSuccess('Task updated', trimmedTitle);
      onClose();
    } catch (error) {
      toast.showError(
        'Could not update task',
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="edit-task-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-test-id="edit-task-modal"
    >
      <GlassCard variant="neon" glow className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-neon">Edit task</div>
        <h3 id="edit-task-title" className="mt-1.5 text-base font-semibold text-text-main">
          {task.title}
        </h3>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs text-text-muted">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              data-test-id="edit-task-title-input"
            />
          </label>

          <label className="block">
            <span className="text-xs text-text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
              data-test-id="edit-task-description-input"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-text-muted">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={inputClass}
                data-test-id="edit-task-priority-select"
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-text-muted">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={inputClass}
                data-test-id="edit-task-status-select"
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs text-text-muted">Urgency</span>
              <select
                value={urgency}
                onChange={(e) => setUrgency(Number(e.target.value))}
                className={inputClass}
                data-test-id="edit-task-urgency-select"
              >
                {SCALE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-text-muted">Importance</span>
              <select
                value={importance}
                onChange={(e) => setImportance(Number(e.target.value))}
                className={inputClass}
                data-test-id="edit-task-importance-select"
              >
                {SCALE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-text-muted">Effort</span>
              <select
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
                className={inputClass}
                data-test-id="edit-task-effort-select"
              >
                {SCALE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-text-muted">Estimated minutes</span>
              <input
                type="number"
                min={0}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="30"
                className={inputClass}
                data-test-id="edit-task-estimated-minutes-input"
              />
            </label>

            <label className="block">
              <span className="text-xs text-text-muted">Area</span>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className={inputClass}
                data-test-id="edit-task-area-select"
              >
                <option value="">General</option>
                {areas?.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <GlowButton variant="ghost" onClick={onClose} data-test-id="edit-task-cancel">
            Cancel
          </GlowButton>
          <GlowButton
            loading={updateTask.isPending}
            onClick={handleSave}
            data-test-id="edit-task-save"
          >
            Save changes
          </GlowButton>
        </div>
      </GlassCard>
    </div>
  );
};
