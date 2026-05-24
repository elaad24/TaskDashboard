import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiSettings } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useSettings = () =>
  useQuery({ queryKey: queryKeys.settings, queryFn: () => apiSettings.get() });

export const useSettingsStatus = () =>
  useQuery({ queryKey: ['settings-status'], queryFn: () => apiSettings.status() });

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiSettings.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      queryClient.invalidateQueries({ queryKey: ['settings-status'] });
    },
  });
};
