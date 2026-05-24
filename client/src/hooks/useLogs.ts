import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateLogInput } from '@command-center/shared';
import { apiLogs } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useLogs = (filters?: { areaId?: string; kind?: string; limit?: number }) =>
  useQuery({
    queryKey: queryKeys.logs(filters),
    queryFn: () => apiLogs.list(filters),
  });

export const useCreateLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLogInput) => apiLogs.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logs'] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};
