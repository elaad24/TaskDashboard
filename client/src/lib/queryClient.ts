import { QueryClient } from '@tanstack/react-query';
import { queryRetryDelay, shouldRetryQuery } from '@/lib/queryRetry';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  overview: ['overview'] as const,
  areas: ['areas'] as const,
  tracks: (areaId?: string) => ['tracks', areaId ?? 'all'] as const,
  goals: (filters?: { status?: string; areaId?: string }) => ['goals', filters ?? {}] as const,
  goal: (id: string) => ['goal', id] as const,
  tasks: (filters?: Record<string, unknown>) => ['tasks', filters ?? {}] as const,
  task: (id: string) => ['task', id] as const,
  problems: (filters?: { status?: string; areaId?: string }) => ['problems', filters ?? {}] as const,
  problem: (id: string) => ['problem', id] as const,
  logs: (filters?: { areaId?: string; kind?: string; limit?: number }) =>
    ['logs', filters ?? {}] as const,
  studyTopics: (filters?: { areaId?: string }) => ['studyTopics', filters ?? {}] as const,
  search: (q: string, types?: Array<string>) => ['search', q, types ?? []] as const,
  settings: ['settings'] as const,
  reminders: (limit = 5) => ['reminders', limit] as const,
  resources: (filters?: Record<string, unknown>) => ['resources', filters ?? {}] as const,
  googleIntegration: ['integrations', 'google'] as const,
  trackedTags: ['tracked-tags'] as const,
  pendingCaptures: ['pending-captures'] as const,
  pendingCapturesCount: ['pending-captures', 'count'] as const,
  sidebarFeed: ['sidebar-feed'] as const,
  urgency: ['urgency'] as const,
  streak: (areaId?: string) => ['streak', areaId ?? 'all'] as const,
  missionMap: (filters?: { areaId?: string; goalId?: string }) =>
    ['mission-map', filters ?? {}] as const,
};
