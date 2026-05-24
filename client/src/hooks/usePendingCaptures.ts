import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AnswerPendingCaptureInput } from '@command-center/shared';
import { apiPendingCaptures } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const usePendingCaptures = () =>
  useQuery({
    queryKey: queryKeys.pendingCaptures,
    queryFn: () => apiPendingCaptures.list(),
    refetchInterval: 60_000,
  });

export const usePendingCapturesCount = () =>
  useQuery({
    queryKey: queryKeys.pendingCapturesCount,
    queryFn: () => apiPendingCaptures.count(),
    refetchInterval: 60_000,
  });

export const usePendingCaptureActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.pendingCaptures });
    void queryClient.invalidateQueries({ queryKey: queryKeys.pendingCapturesCount });
    void queryClient.invalidateQueries({ queryKey: queryKeys.logs() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
  };

  const answer = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AnswerPendingCaptureInput }) =>
      apiPendingCaptures.answer(id, input),
    onSuccess: invalidate,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => apiPendingCaptures.dismiss(id),
    onSuccess: invalidate,
  });

  const snooze = useMutation({
    mutationFn: (id: string) => apiPendingCaptures.snooze(id, 1),
    onSuccess: invalidate,
  });

  return { answer, dismiss, snooze };
};
