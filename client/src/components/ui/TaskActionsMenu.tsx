import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Task } from '@command-center/shared';
import { useToast } from '@/components/ui/Toast';
import { useDeleteTask } from '@/hooks/useTasks';
import { cn } from '@/lib/cn';

type TaskActionsMenuProps = {
  task: Task;
  onEdit: (task: Task) => void;
  className?: string;
};

export const TaskActionsMenu = ({ task, onEdit, className }: TaskActionsMenuProps) => {
  const deleteTask = useDeleteTask();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setConfirmDelete(false);
  };

  const handleEdit = () => {
    onEdit(task);
    setOpen(false);
  };

  const handleDeleteClick = async (event: Event) => {
    if (!confirmDelete) {
      event.preventDefault();
      setConfirmDelete(true);
      return;
    }

    try {
      await deleteTask.mutateAsync(task.id);
      toast.showSuccess('Task deleted', task.title);
      setOpen(false);
      setConfirmDelete(false);
    } catch (error) {
      toast.showError(
        'Could not delete task',
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex items-center justify-center rounded-md border border-transparent p-1.5 text-text-muted transition-all hover:border-border-accent hover:bg-white/[0.04] hover:text-cyan focus:outline-none focus-visible:ring-1 focus-visible:ring-border-accent',
            className,
          )}
          aria-label={`Actions for ${task.title}`}
          data-test-id={`task-actions-${task.id}`}
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="end"
          onClick={(e) => e.stopPropagation()}
          className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-border-subtle bg-bg-soft p-1 shadow-glass-lg"
          data-test-id={`task-actions-menu-${task.id}`}
        >
          <DropdownMenu.Item
            onSelect={handleEdit}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-text-main outline-none transition-colors data-[highlighted]:bg-white/10"
            data-test-id={`task-action-edit-${task.id}`}
          >
            <Pencil size={12} className="text-text-soft" />
            <span>Edit</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={handleDeleteClick}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs outline-none transition-colors data-[highlighted]:bg-white/10',
              confirmDelete
                ? 'text-danger-400 data-[highlighted]:bg-danger/10'
                : 'text-danger-400/90',
            )}
            data-test-id={`task-action-delete-${task.id}`}
          >
            <Trash2 size={12} />
            <span>{confirmDelete ? 'Confirm delete' : 'Delete'}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
