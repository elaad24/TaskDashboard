import { useQuery } from '@tanstack/react-query';
import { apiTasks } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useMissionMap = (filters?: { areaId?: string; goalId?: string }) =>
  useQuery({
    queryKey: queryKeys.missionMap(filters),
    queryFn: () => apiTasks.missionMap(filters),
  });
