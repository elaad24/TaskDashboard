import { useQuery } from '@tanstack/react-query';
import { apiStreak } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useStreak = (areaId?: string) =>
  useQuery({
    queryKey: queryKeys.streak(areaId),
    queryFn: () => apiStreak.get(areaId),
  });
