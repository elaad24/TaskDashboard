import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConfirmParseInput } from '@command-center/shared';
import { apiAI } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useParseBrainDump = () =>
  useMutation({
    mutationFn: ({ text, correction }: { text: string; correction?: string }) =>
      apiAI.parse(text, correction),
  });

export const useConfirmParse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfirmParseInput) => apiAI.confirm(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['problems'] });
      qc.invalidateQueries({ queryKey: ['logs'] });
      qc.invalidateQueries({ queryKey: ['studyTopics'] });
    },
  });
};

export const useNextAction = () =>
  useMutation({
    mutationFn: (input: { availableMinutes?: number; context?: string }) =>
      apiAI.nextAction(input),
  });

export const useBreakdownGoal = () =>
  useMutation({
    mutationFn: (goalId: string) => apiAI.breakdownGoal(goalId),
  });

export const useSolveProblem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (problemId: string) => apiAI.solveProblem(problemId),
    onSuccess: (_, problemId) => {
      qc.invalidateQueries({ queryKey: queryKeys.problem(problemId) });
      qc.invalidateQueries({ queryKey: ['problems'] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};
