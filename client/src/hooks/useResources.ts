import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateResourceInput, UpdateResourceInput } from '@command-center/shared';
import { apiResources } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

type ResourceFilters = {
  areaId?: string;
  trackId?: string;
  goalId?: string;
  studyTopicId?: string;
  type?: string;
  q?: string;
};

export const useResources = (filters?: ResourceFilters) =>
  useQuery({
    queryKey: queryKeys.resources(filters),
    queryFn: () => apiResources.list(filters),
  });

export const useCreateResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResourceInput) => apiResources.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });
};

export const useUpdateResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateResourceInput }) =>
      apiResources.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });
};

export const useDeleteResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiResources.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });
};
