import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IntegrationSettingsPatch } from '@command-center/shared';
import { apiIntegrations } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export const useGoogleIntegration = () =>
  useQuery({
    queryKey: queryKeys.googleIntegration,
    queryFn: () => apiIntegrations.googleStatus(),
    refetchInterval: 60_000,
  });

export const useGoogleIntegrationActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: queryKeys.googleIntegration });

  const connect = useMutation({
    mutationFn: async () => {
      const { url } = await apiIntegrations.googleAuthUrl();
      window.location.href = url;
    },
  });

  const disconnect = useMutation({
    mutationFn: () => apiIntegrations.googleDisconnect(),
    onSuccess: invalidate,
  });

  const scan = useMutation({
    mutationFn: () => apiIntegrations.googleScan(),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.pendingCaptures });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pendingCapturesCount });
    },
  });

  const updateSettings = useMutation({
    mutationFn: (patch: IntegrationSettingsPatch) => apiIntegrations.googleSettings(patch),
    onSuccess: invalidate,
  });

  return { connect, disconnect, scan, updateSettings };
};
