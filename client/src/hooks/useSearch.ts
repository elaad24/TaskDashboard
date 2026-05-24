import { useQuery } from '@tanstack/react-query';
import { apiSearch } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useSearch = (q: string, types?: Array<string>, summarize = true) =>
  useQuery({
    queryKey: queryKeys.search(q, types),
    queryFn: () => apiSearch.query(q, types, summarize),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });
