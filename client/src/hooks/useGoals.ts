import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateGoalInput, ReorderInput, UpdateGoalInput } from '@command-center/shared';
import { apiGoals } from '@/lib/api';
import { celebrate } from '@/lib/celebrate';
import { queryKeys } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['goals'] });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  qc.invalidateQueries({ queryKey: queryKeys.urgency });
  qc.invalidateQueries({ queryKey: ['streak'] });
  qc.invalidateQueries({ queryKey: queryKeys.overview });
};

export const useGoals = (filters?: { status?: string; areaId?: string }) =>
  useQuery({
    queryKey: queryKeys.goals(filters),
    queryFn: () => apiGoals.list(filters),
  });

export const useGoal = (id: string | null | undefined) =>
  useQuery({
    queryKey: queryKeys.goal(id ?? ''),
    queryFn: () => apiGoals.get(id as string),
    enabled: Boolean(id),
  });

export const useCreateGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => apiGoals.create(input),
    onSuccess: () => {
      celebrate('create');
      invalidate(qc);
    },
  });
};

export const useUpdateGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) =>
      apiGoals.update(id, input),
    onSuccess: (_, vars) => {
      if (vars.input.progress !== undefined || vars.input.status !== undefined) {
        celebrate('update');
      }
      invalidate(qc);
      qc.invalidateQueries({ queryKey: queryKeys.goal(vars.id) });
    },
  });
};

export const useCompleteGoal = () => {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiGoals.update(id, { status: 'done', progress: 100 }),
    onSuccess: (_, vars) => {
      celebrate('goal');
      toast.showSuccess('Goal completed', vars.title);
      invalidate(qc);
      qc.invalidateQueries({ queryKey: queryKeys.goal(vars.id) });
    },
    onError: (error) => {
      toast.showError('Could not complete goal', error instanceof Error ? error.message : undefined);
    },
  });
};

export const useDeleteGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiGoals.delete(id),
    onSuccess: () => invalidate(qc),
  });
};

export const useReorderGoals = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderInput) => apiGoals.reorder(input),
    onSuccess: () => invalidate(qc),
  });
};
