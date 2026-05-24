import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateAreaInput, UpdateAreaInput } from '@command-center/shared';
import { apiAreas, apiTracks } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useAreas = () =>
  useQuery({ queryKey: queryKeys.areas, queryFn: () => apiAreas.list() });

export const useTracks = (areaId?: string) =>
  useQuery({
    queryKey: queryKeys.tracks(areaId),
    queryFn: () => apiTracks.list(areaId),
  });

export const useCreateArea = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAreaInput) => apiAreas.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.areas });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useUpdateArea = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAreaInput }) =>
      apiAreas.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.areas });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};
