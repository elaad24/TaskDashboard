import { useQuery } from '@tanstack/react-query';
import { apiUrgency } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useUrgency = () =>
  useQuery({
    queryKey: queryKeys.urgency,
    queryFn: () => apiUrgency.get(),
  });
