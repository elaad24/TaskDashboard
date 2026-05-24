import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiAI, apiOverview, apiReminders } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { shouldRetryQuery } from '@/lib/queryRetry';

export const useOverview = () =>
  useQuery({
    queryKey: queryKeys.overview,
    queryFn: () => apiOverview.get(),
    retry: shouldRetryQuery,
    refetchInterval: (query) => (query.state.error ? false : 60_000),
    refetchOnWindowFocus: false,
  });

export const useOverviewBriefing = () => {
  return useMutation({
    mutationFn: (snapshot: Awaited<ReturnType<typeof apiOverview.get>>) => apiAI.overviewBriefing(snapshot),
  });
};

export const useReminders = () =>
  useQuery({
    queryKey: queryKeys.reminders(),
    queryFn: () => apiReminders.list(5),
  });

export const useReminderActions = () => {
  const queryClient = useQueryClient();
  return {
    markSent: useMutation({
      mutationFn: (id: string) => apiReminders.markSent(id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reminders() }),
    }),
    cancel: useMutation({
      mutationFn: (id: string) => apiReminders.cancel(id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reminders() }),
    }),
  };
};
