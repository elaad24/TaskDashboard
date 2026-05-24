import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProblemInput, UpdateProblemInput } from '@command-center/shared';
import { apiProblems } from '@/lib/api';
import { celebrate } from '@/lib/celebrate';
import { queryKeys } from '@/lib/queryClient';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['problems'] });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
};

export const useProblems = (filters?: { status?: string; areaId?: string }) =>
  useQuery({
    queryKey: queryKeys.problems(filters),
    queryFn: () => apiProblems.list(filters),
  });

export const useProblem = (id: string | null | undefined) =>
  useQuery({
    queryKey: queryKeys.problem(id ?? ''),
    queryFn: () => apiProblems.get(id as string),
    enabled: Boolean(id),
  });

export const useCreateProblem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProblemInput) => apiProblems.create(input),
    onSuccess: () => {
      celebrate('create');
      invalidate(qc);
    },
  });
};

export const useUpdateProblem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProblemInput }) =>
      apiProblems.update(id, input),
    onSuccess: () => invalidate(qc),
  });
};
