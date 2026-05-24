import { useQuery } from '@tanstack/react-query';
import { apiDashboard } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useDashboard = () =>
  useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiDashboard.get(),
    refetchInterval: 60_000,
  });
