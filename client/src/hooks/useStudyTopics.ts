import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateStudyTopicInput,
  UpdateStudyTopicInput,
} from '@command-center/shared';
import { apiStudyTopics } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['studyTopics'] });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
};

export const useStudyTopics = (filters?: { areaId?: string }) =>
  useQuery({
    queryKey: queryKeys.studyTopics(filters),
    queryFn: () => apiStudyTopics.list(filters),
  });

export const useCreateStudyTopic = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudyTopicInput) => apiStudyTopics.create(input),
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateStudyTopic = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStudyTopicInput }) =>
      apiStudyTopics.update(id, input),
    onSuccess: () => invalidate(qc),
  });
};
