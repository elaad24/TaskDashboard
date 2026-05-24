import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CompleteTaskInput,
  CreateTaskInput,
  CreateRecurrenceInput,
  ReorderInput,
  TaskFilters,
  UpdateTaskInput,
} from '@command-center/shared';
import { STREAK_MILESTONES } from '@command-center/shared';
import { apiStreak, apiTasks } from '@/lib/api';
import { celebrate } from '@/lib/celebrate';
import { queryKeys } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['tasks'] });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  qc.invalidateQueries({ queryKey: ['logs'] });
  qc.invalidateQueries({ queryKey: queryKeys.urgency });
  qc.invalidateQueries({ queryKey: ['streak'] });
  qc.invalidateQueries({ queryKey: queryKeys.overview });
  qc.invalidateQueries({ queryKey: ['mission-map'] });
};

export const useTasks = (filters?: TaskFilters) =>
  useQuery({
    queryKey: queryKeys.tasks(filters as Record<string, unknown> | undefined),
    queryFn: () => apiTasks.list(filters),
  });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => apiTasks.create(input),
    onSuccess: () => {
      celebrate('create');
      invalidate(qc);
    },
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      apiTasks.update(id, input),
    onSuccess: (_, vars) => {
      if (vars.input.status === 'in_progress' || vars.input.status === 'done') {
        celebrate('update');
      }
      invalidate(qc);
    },
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiTasks.delete(id),
    onSuccess: () => invalidate(qc),
  });
};

export const useCompleteTask = () => {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompleteTaskInput }) =>
      apiTasks.complete(id, input),
    onSuccess: async (result) => {
      celebrate('complete');
      toast.showSuccess('Task completed', result.task.title);
      if (result.warnings.length > 0) {
        toast.showError('Prerequisites open', result.warnings.join('; '));
      }
      invalidate(qc);
      try {
        const streak = await apiStreak.get();
        if ((STREAK_MILESTONES as ReadonlyArray<number>).includes(streak.currentStreak)) {
          celebrate('streak');
          toast.showSuccess('Streak milestone', `${streak.currentStreak}-day streak`);
        }
      } catch {
        /* streak check is best-effort */
      }
    },
    onError: (error) => {
      toast.showError('Could not complete task', error instanceof Error ? error.message : undefined);
    },
  });
};

export const useReorderTasks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderInput) => apiTasks.reorder(input),
    onSuccess: () => invalidate(qc),
  });
};

export const useCreateTaskRecurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: CreateRecurrenceInput }) =>
      apiTasks.createRecurrence(taskId, input),
    onSuccess: () => invalidate(qc),
  });
};

export const useDeleteTaskRecurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => apiTasks.deleteRecurrence(taskId),
    onSuccess: () => invalidate(qc),
  });
};
