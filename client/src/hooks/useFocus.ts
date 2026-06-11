import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateFocusSessionInput,
  FocusRange,
  FocusSuggestInput,
} from '@command-center/shared';
import { apiFocus } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useFocusSessions = (range: FocusRange = 'all') =>
  useQuery({
    queryKey: queryKeys.focusSessions(range),
    queryFn: () => apiFocus.listSessions(range),
  });

export const useFocusStats = (range: FocusRange = 'week') =>
  useQuery({
    queryKey: queryKeys.focusStats(range),
    queryFn: () => apiFocus.getStats(range),
  });

export const useFocusInsight = () =>
  useQuery({
    queryKey: queryKeys.focusInsight,
    queryFn: () => apiFocus.getLatestInsight(),
  });

export const useSuggestFocusLinks = () =>
  useMutation({
    mutationFn: (input: FocusSuggestInput) => apiFocus.suggestLinks(input),
  });

export const useCreateFocusSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFocusSessionInput) => apiFocus.createSession(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['focus'] });
      qc.invalidateQueries({ queryKey: ['studyTopics'] });
      qc.invalidateQueries({ queryKey: ['logs'] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useGenerateFocusInsight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFocus.generateInsight(),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.focusInsight, data);
    },
  });
};
