import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateFeedGroupInput,
  CreateFeedItemInput,
  UpdateFeedGroupInput,
  UpdateFeedItemInput,
} from '@command-center/shared';
import { apiSidebarFeed } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useSidebarFeed = () =>
  useQuery({
    queryKey: queryKeys.sidebarFeed,
    queryFn: () => apiSidebarFeed.list(),
  });

export const useSidebarFeedActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: queryKeys.sidebarFeed });

  const createGroup = useMutation({
    mutationFn: (input: CreateFeedGroupInput) => apiSidebarFeed.createGroup(input),
    onSuccess: invalidate,
  });

  const updateGroup = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFeedGroupInput }) =>
      apiSidebarFeed.updateGroup(id, input),
    onSuccess: invalidate,
  });

  const removeGroup = useMutation({
    mutationFn: (id: string) => apiSidebarFeed.deleteGroup(id),
    onSuccess: invalidate,
  });

  const createItem = useMutation({
    mutationFn: (input: CreateFeedItemInput) => apiSidebarFeed.createItem(input),
    onSuccess: invalidate,
  });

  const updateItem = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFeedItemInput }) =>
      apiSidebarFeed.updateItem(id, input),
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => apiSidebarFeed.deleteItem(id),
    onSuccess: invalidate,
  });

  return { createGroup, updateGroup, removeGroup, createItem, updateItem, removeItem };
};
