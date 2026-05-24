import { useMemo, useState, useEffect } from 'react';
import { Plus, Check, CalendarPlus } from 'lucide-react';
import type { CompleteTaskInput, Task, TaskFilters } from '@command-center/shared';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { WorkSwitcher } from '@/components/nav/WorkSwitcher';
import { setLastWorkView } from '@/lib/workView';
import { AnimatedPage } from '@/components/motion/AnimatedPage';
import { StaggerItem } from '@/components/motion/StaggerItem';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SortableList } from '@/components/dnd/SortableList';
import {
  useCompleteTask,
  useCreateTask,
  useCreateTaskRecurrence,
  useDeleteTaskRecurrence,
  useReorderTasks,
  useTasks,
} from '@/hooks/useTasks';
import { useAreas } from '@/hooks/useAreas';
import { cn } from '@/lib/cn';
import { formatMinutes } from '@/lib/format';
import { useAddToCalendar } from '@/hooks/useCalendar';
import { useToast } from '@/components/ui/Toast';

const FILTERS: Array<{ key: TaskFilters['filter']; label: string }> = [
  { key: 'open', label: 'Open' },
  { key: 'today', label: 'Today' },
  { key: 'high_priority', label: 'High priority' },
  { key: 'no_deadline', label: 'No deadline' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'ai', label: 'AI generated' },
  { key: 'manual', label: 'Manual' },
  { key: 'done', label: 'Done' },
];

type CompletionModalState = { task: Task | null };
type RecurrenceModalState = { task: Task | null };

const CompletionModal = ({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) => {
  const complete = useCompleteTask();
  const [time, setTime] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [note, setNote] = useState('');

  const handleSave = async () => {
    const payload: CompleteTaskInput = {};
    if (time) {
      const n = Number(time);
      if (!Number.isNaN(n) && n > 0) payload.timeSpentMinutes = n;
    }
    if (cost) {
      const n = Number(cost);
      if (!Number.isNaN(n) && n >= 0) payload.costAmount = n;
    }
    if (note.trim()) payload.note = note.trim();
    await complete.mutateAsync({ id: task.id, input: payload });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <GlassCard variant="neon" glow className="w-full max-w-md p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-neon">Completed</div>
        <h3 className="mt-1.5 text-base font-semibold text-text-main">{task.title}</h3>
        <p className="mt-1 text-xs text-text-soft">Optional follow-up:</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs text-text-muted">Time spent (minutes)</span>
            <input
              type="number"
              min={0}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder={task.estimatedMinutes ? String(task.estimatedMinutes) : '30'}
              className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Cost</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Enough food for 5 days."
              className="mt-1 w-full resize-y rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <GlowButton variant="ghost" onClick={onClose}>
            Skip
          </GlowButton>
          <GlowButton onClick={handleSave} loading={complete.isPending} leftIcon={<Check size={14} />}>
            Save
          </GlowButton>
        </div>
      </GlassCard>
    </div>
  );
};

export const TasksPage = () => {
  const [filter, setFilter] = useState<TaskFilters['filter']>('open');
  const [hideRecurringTemplates, setHideRecurringTemplates] = useState(true);
  const [areaId, setAreaId] = useState<string | undefined>(undefined);
  const { data: areas } = useAreas();
  const tasks = useTasks({ filter, areaId, hideRecurringTemplates });
  const createTask = useCreateTask();
  const completeMutation = useCompleteTask();
  const reorderTasks = useReorderTasks();
  const createRecurrence = useCreateTaskRecurrence();
  const deleteRecurrence = useDeleteTaskRecurrence();
  const calendar = useAddToCalendar();
  const toast = useToast();
  const [newTitle, setNewTitle] = useState('');
  const [completion, setCompletion] = useState<CompletionModalState>({ task: null });
  const [recurrence, setRecurrence] = useState<RecurrenceModalState>({ task: null });
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'interval'>(
    'daily',
  );
  const [recurrenceTime, setRecurrenceTime] = useState('09:00');
  const [recurrenceIntervalDays, setRecurrenceIntervalDays] = useState('2');
  const [recurrenceMonthDay, setRecurrenceMonthDay] = useState('1');
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<Array<number>>([1, 3, 5]);
  const [autoCreateCalendarEvent, setAutoCreateCalendarEvent] = useState(false);

  useEffect(() => {
    setLastWorkView('tasks');
  }, []);

  const areaName = useMemo(
    () => (id: string | null) => areas?.find((a) => a.id === id)?.name ?? 'General',
    [areas],
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createTask.mutateAsync({ title: newTitle.trim(), areaId: areaId ?? undefined });
    setNewTitle('');
  };

  const renderTaskRow = (t: Task) => (
    <div className="flex flex-wrap items-center gap-3 px-1 py-2 transition-colors hover:bg-white/[0.02]">
      <button
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full border transition-all',
          t.status === 'done'
            ? 'border-neon bg-neon/20 text-neon'
            : 'border-border-subtle hover:border-border-accent hover:bg-cyan/10',
        )}
        onClick={() => {
          if (t.status === 'done') return;
          setCompletion({ task: t });
        }}
        aria-label={t.status === 'done' ? 'Already done' : `Complete ${t.title}`}
      >
        {t.status === 'done' && <Check size={12} />}
      </button>

      <div className="min-w-[12rem] flex-1">
        <div
          className={cn(
            'text-sm font-medium',
            t.status === 'done' ? 'text-text-muted line-through' : 'text-text-main',
          )}
        >
          {t.title}
        </div>
        {t.reason && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-text-soft">{t.reason}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge tone="muted">{areaName(t.areaId)}</StatusBadge>
        <PriorityBadge priority={t.priority} />
        {t.estimatedMinutes && (
          <StatusBadge tone="muted">~{formatMinutes(t.estimatedMinutes)}</StatusBadge>
        )}
        {t.source === 'ai' && <StatusBadge tone="cyan">AI</StatusBadge>}
        {t.recurrenceId && <StatusBadge tone="neon">Recurring instance</StatusBadge>}
        {t.isRecurringTemplate && <StatusBadge tone="cyan">Recurring template</StatusBadge>}
      </div>

      {t.status !== 'done' && (
        <div className="flex items-center gap-2">
          {t.dueDate && (
            <GlowButton
              size="sm"
              variant="ghost"
              leftIcon={<CalendarPlus size={14} />}
              onClick={async () => {
                try {
                  const result = await calendar.addTask.mutateAsync(t.id);
                  toast.showSuccess('Added to calendar', result.htmlLink ?? undefined);
                } catch (error) {
                  toast.showError('Calendar', calendar.getErrorMessage(error));
                }
              }}
              loading={calendar.addTask.isPending && calendar.addTask.variables === t.id}
              data-test-id={`task-calendar-${t.id}`}
            >
              Add to calendar
            </GlowButton>
          )}
          <GlowButton
            size="sm"
            variant="ghost"
            onClick={() => setRecurrence({ task: t })}
            data-test-id={`task-repeat-${t.id}`}
          >
            Repeat
          </GlowButton>
          <GlowButton
            size="sm"
            variant="subtle"
            onClick={() => setCompletion({ task: t })}
            loading={completeMutation.isPending && completeMutation.variables?.id === t.id}
          >
            Complete
          </GlowButton>
        </div>
      )}
    </div>
  );

  const handleSaveRecurrence = async () => {
    if (!recurrence.task) return;
    const startsOn = new Date().toISOString();
    await createRecurrence.mutateAsync({
      taskId: recurrence.task.id,
      input: {
        frequency: recurrenceFrequency,
        timeOfDay: recurrenceTime,
        startsOn,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        intervalDays: recurrenceFrequency === 'interval' ? Number(recurrenceIntervalDays || '1') : null,
        monthDay: recurrenceFrequency === 'monthly' ? Number(recurrenceMonthDay || '1') : null,
        weekdays: recurrenceFrequency === 'weekly' ? recurrenceWeekdays : null,
        autoCreateCalendarEvent,
      },
    });
    setRecurrence({ task: null });
  };

  return (
    <PageScroll>
      <AnimatedPage>
        <StaggerItem index={0}>
          <WorkSwitcher />
        </StaggerItem>
        <StaggerItem index={1}>
          <PageHeader
            title="Tasks"
        description="Drag to reprioritize. Complete tasks to celebrate wins."
        action={
          <div className="flex flex-wrap gap-2">
            <select
              value={areaId ?? ''}
              onChange={(e) => setAreaId(e.target.value || undefined)}
              className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none"
              aria-label="Filter by area"
            >
              <option value="">All areas</option>
              {areas?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Quick task..."
              className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none"
            />
            <GlowButton leftIcon={<Plus size={14} />} onClick={handleCreate} loading={createTask.isPending}>
              Add
            </GlowButton>
          </div>
        }
      />
        </StaggerItem>

        <StaggerItem index={2}>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] transition-all',
              filter === f.key
                ? 'border-border-accent-strong bg-cyan/10 text-cyan-200'
                : 'border-border-subtle bg-white/[0.02] text-text-soft hover:border-border-accent hover:text-text-main',
            )}
            data-test-id={`task-filter-${f.key}`}
          >
            {f.label}
          </button>
        ))}
        <label className="ml-2 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-white/[0.02] px-3 py-1 text-[11px] text-text-soft">
          <input
            type="checkbox"
            checked={hideRecurringTemplates}
            onChange={(e) => setHideRecurringTemplates(e.target.checked)}
            className="accent-cyan"
          />
          Hide recurring templates
        </label>
      </div>

      <GlassCard interactive className="p-2">
        {tasks.isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (tasks.data?.length ?? 0) === 0 ? (
          <EmptyState
            className="m-4"
            title="No tasks for this filter."
            description="Try a different filter, or capture one above."
          />
        ) : filter === 'done' ? (
          <ul className="divide-y divide-border-subtle">
            {tasks.data!.map((t) => (
              <li key={t.id} className="px-3 py-1">
                {renderTaskRow(t)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-2">
            <SortableList
              items={tasks.data!}
              disabled={reorderTasks.isPending}
              onReorder={(orderedIds) => reorderTasks.mutateAsync({ orderedIds })}
              renderItem={(t) => renderTaskRow(t)}
            />
          </div>
        )}
      </GlassCard>

      {completion.task && (
        <CompletionModal task={completion.task} onClose={() => setCompletion({ task: null })} />
      )}

      {recurrence.task && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => e.target === e.currentTarget && setRecurrence({ task: null })}
        >
          <GlassCard variant="neon" glow className="w-full max-w-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neon">Recurring task setup</div>
            <h3 className="mt-1.5 text-base font-semibold text-text-main">{recurrence.task.title}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-text-muted">Frequency</span>
                <select
                  value={recurrenceFrequency}
                  onChange={(e) =>
                    setRecurrenceFrequency(
                      e.target.value as 'daily' | 'weekly' | 'monthly' | 'interval',
                    )
                  }
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="interval">Every N days</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Time of day</span>
                <input
                  type="time"
                  value={recurrenceTime}
                  onChange={(e) => setRecurrenceTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                />
              </label>
              {recurrenceFrequency === 'interval' && (
                <label className="block">
                  <span className="text-xs text-text-muted">Every N days</span>
                  <input
                    type="number"
                    min={1}
                    value={recurrenceIntervalDays}
                    onChange={(e) => setRecurrenceIntervalDays(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                  />
                </label>
              )}
              {recurrenceFrequency === 'monthly' && (
                <label className="block">
                  <span className="text-xs text-text-muted">Day of month</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={recurrenceMonthDay}
                    onChange={(e) => setRecurrenceMonthDay(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                  />
                </label>
              )}
            </div>
            {recurrenceFrequency === 'weekly' && (
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { id: 0, label: 'Sun' },
                  { id: 1, label: 'Mon' },
                  { id: 2, label: 'Tue' },
                  { id: 3, label: 'Wed' },
                  { id: 4, label: 'Thu' },
                  { id: 5, label: 'Fri' },
                  { id: 6, label: 'Sat' },
                ].map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    className={cn(
                      'rounded-full border px-3 py-1 text-[11px]',
                      recurrenceWeekdays.includes(day.id)
                        ? 'border-border-accent-strong bg-cyan/10 text-cyan-200'
                        : 'border-border-subtle text-text-soft',
                    )}
                    onClick={() =>
                      setRecurrenceWeekdays((prev) =>
                        prev.includes(day.id) ? prev.filter((value) => value !== day.id) : [...prev, day.id],
                      )
                    }
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}
            <label className="mt-4 inline-flex items-center gap-2 text-xs text-text-soft">
              <input
                type="checkbox"
                checked={autoCreateCalendarEvent}
                onChange={(event) => setAutoCreateCalendarEvent(event.target.checked)}
                className="accent-cyan"
              />
              Auto-create Google Calendar events (counts toward daily cap)
            </label>
            <div className="mt-5 flex justify-between gap-2">
              <GlowButton
                variant="ghost"
                onClick={async () => {
                  if (!recurrence.task?.isRecurringTemplate) return;
                  await deleteRecurrence.mutateAsync(recurrence.task.id);
                  setRecurrence({ task: null });
                }}
              >
                Remove recurrence
              </GlowButton>
              <div className="flex gap-2">
                <GlowButton variant="ghost" onClick={() => setRecurrence({ task: null })}>
                  Cancel
                </GlowButton>
                <GlowButton
                  onClick={handleSaveRecurrence}
                  loading={createRecurrence.isPending || deleteRecurrence.isPending}
                >
                  Save recurrence
                </GlowButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
        </StaggerItem>
      </AnimatedPage>
    </PageScroll>
  );
};
