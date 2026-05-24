import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTrackedTagInput, UpdateTrackedTagInput } from '@command-center/shared';
import { apiTrackedTags } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useTrackedTags = () =>
  useQuery({
    queryKey: queryKeys.trackedTags,
    queryFn: () => apiTrackedTags.list(),
  });

export const useTrackedTagActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: queryKeys.trackedTags });

  const create = useMutation({
    mutationFn: (input: CreateTrackedTagInput) => apiTrackedTags.create(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTrackedTagInput }) =>
      apiTrackedTags.update(id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiTrackedTags.delete(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
};
