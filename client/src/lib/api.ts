import {
  areaSchema,
  confirmParseInputSchema,
  confirmParseResponseSchema,
  createAreaInputSchema,
  createGoalInputSchema,
  createLogInputSchema,
  createProblemInputSchema,
  createResourceInputSchema,
  createStudyTopicInputSchema,
  createTaskInputSchema,
  dashboardResponseSchema,
  createRecurrenceInputSchema,
  createReminderInputSchema,
  goalBreakdownResponseSchema,
  goalSchema,
  logSchema,
  nextActionResponseSchema,
  overviewBriefingResponseSchema,
  overviewResponseSchema,
  googleIntegrationStatusSchema,
  integrationSettingsPatchSchema,
  pendingCaptureSchema,
  scanResultSchema,
  trackedTagSchema,
  answerPendingCaptureInputSchema,
  createTrackedTagInputSchema,
  updateTrackedTagInputSchema,
  sidebarFeedResponseSchema,
  feedGroupSchema,
  feedItemSchema,
  createFeedGroupInputSchema,
  updateFeedGroupInputSchema,
  createFeedItemInputSchema,
  updateFeedItemInputSchema,
  urgencyResponseSchema,
  streakResponseSchema,
  type UrgencyResponse,
  type StreakResponse,
  ingestInputSchema,
  ingestResponseSchema,
  ingestSpecSchema,
  backupImportResponseSchema,
  backupPayloadSchema,
  createFocusSessionInputSchema,
  focusInsightSchema,
  focusSessionSchema,
  focusStatsSchema,
  focusSuggestInputSchema,
  focusSuggestResponseSchema,
  parseInputSchema,
  parseResponseSchema,
  problemSchema,
  recurrenceSchema,
  reminderSchema,
  resourceSchema,
  searchResponseSchema,
  settingsPatchInputSchema,
  settingsSchema,
  settingsStatusSchema,
  solveProblemResponseSchema,
  studyTopicSchema,
  taskSchema,
  trackSchema,
  updateAreaInputSchema,
  updateGoalInputSchema,
  updateProblemInputSchema,
  updateResourceInputSchema,
  updateStudyTopicInputSchema,
  updateTaskInputSchema,
  type Area,
  type ConfirmParseInput,
  type ConfirmParseResponse,
  type CreateAreaInput,
  type CreateGoalInput,
  type CreateLogInput,
  type CreateProblemInput,
  type CreateResourceInput,
  type CreateStudyTopicInput,
  type CreateTaskInput,
  type CreateRecurrenceInput,
  type CreateReminderInput,
  type DashboardResponse,
  type GoalBreakdownResponse,
  type Goal,
  type Log,
  type NextActionResponse,
  type IngestResponse,
  type IngestSpec,
  type GoogleIntegrationStatus,
  type IntegrationSettingsPatch,
  type PendingCapture,
  type AnswerPendingCaptureInput,
  type TrackedTag,
  type CreateTrackedTagInput,
  type UpdateTrackedTagInput,
  type SidebarFeedResponse,
  type FeedGroup,
  type FeedItem,
  type CreateFeedGroupInput,
  type UpdateFeedGroupInput,
  type CreateFeedItemInput,
  type UpdateFeedItemInput,
  type ScanResult,
  type OverviewBriefingResponse,
  type OverviewResponse,
  type ParseResponse,
  type Problem,
  type Reminder,
  type TaskRecurrence,
  type Resource,
  type SearchResponse,
  type SolveProblemResponse,
  type StudyTopic,
  type Task,
  type TaskFilters,
  type Track,
  type UpdateAreaInput,
  type UpdateGoalInput,
  type UpdateProblemInput,
  type UpdateResourceInput,
  type UpdateStudyTopicInput,
  type UpdateTaskInput,
  type Settings,
  type SettingsPatchInput,
  type SettingsStatus,
  type CompleteTaskInput,
  completeTaskResponseSchema,
  missionMapResponseSchema,
  type CompleteTaskResponse,
  type MissionMapResponse,
  completeTaskInputSchema,
  reorderInputSchema,
  type ReorderInput,
  type CreateFocusSessionInput,
  type FocusInsight,
  type FocusRange,
  type FocusSession,
  type FocusStats,
  type FocusSuggestInput,
  type FocusSuggestResponse,
} from '@command-center/shared';
import { z, type ZodSchema } from 'zod';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  status: number;
  code: string;
  detail?: unknown;

  constructor(status: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const buildUrl = (path: string, query?: Record<string, unknown>): string => {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
};

const request = async <T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    query?: Record<string, unknown>;
    schema?: ZodSchema<T>;
    expectVoid?: boolean;
  } = {},
): Promise<T> => {
  const url = buildUrl(path, options.query);
  const res = await fetch(url, {
    method,
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let body: { error?: { code?: string; message?: string; detail?: unknown } } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      // ignore
    }
    throw new ApiError(
      res.status,
      body.error?.code ?? 'HTTP_ERROR',
      body.error?.message ?? `Request failed: ${res.status}`,
      body.error?.detail,
    );
  }

  if (options.expectVoid || res.status === 204) {
    return undefined as T;
  }

  const json = (await res.json()) as unknown;
  if (options.schema) {
    return options.schema.parse(json);
  }
  return json as T;
};

// ---------------------------------------------------------------------------
// Areas + Tracks
// ---------------------------------------------------------------------------

export const apiAreas = {
  list: () => request('GET', '/api/areas', { schema: z.array(areaSchema) }),
  create: (input: CreateAreaInput) =>
    request('POST', '/api/areas', { body: createAreaInputSchema.parse(input), schema: areaSchema }),
  update: (id: string, input: UpdateAreaInput) =>
    request('PATCH', `/api/areas/${id}`, {
      body: updateAreaInputSchema.parse(input),
      schema: areaSchema,
    }),
  delete: (id: string) => request<void>('DELETE', `/api/areas/${id}`, { expectVoid: true }),
};

export const apiTracks = {
  list: (areaId?: string) =>
    request('GET', '/api/tracks', { query: { areaId }, schema: z.array(trackSchema) }),
  create: (input: { areaId: string; name: string; description?: string }) =>
    request('POST', '/api/tracks', { body: input, schema: trackSchema }),
};

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export const apiGoals = {
  list: (filters?: { status?: string; areaId?: string }) =>
    request('GET', '/api/goals', { query: filters, schema: z.array(goalSchema) }),
  get: (id: string) => request('GET', `/api/goals/${id}`, { schema: goalSchema }),
  create: (input: CreateGoalInput) =>
    request('POST', '/api/goals', { body: createGoalInputSchema.parse(input), schema: goalSchema }),
  update: (id: string, input: UpdateGoalInput) =>
    request('PATCH', `/api/goals/${id}`, {
      body: updateGoalInputSchema.parse(input),
      schema: goalSchema,
    }),
  delete: (id: string) => request<void>('DELETE', `/api/goals/${id}`, { expectVoid: true }),
  reorder: (input: ReorderInput) =>
    request<void>('POST', '/api/goals/reorder', {
      body: reorderInputSchema.parse(input),
      expectVoid: true,
    }),
};

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const apiTasks = {
  list: (filters?: TaskFilters) =>
    request('GET', '/api/tasks', { query: filters, schema: z.array(taskSchema) }),
  get: (id: string) => request('GET', `/api/tasks/${id}`, { schema: taskSchema }),
  create: (input: CreateTaskInput) =>
    request('POST', '/api/tasks', { body: createTaskInputSchema.parse(input), schema: taskSchema }),
  update: (id: string, input: UpdateTaskInput) =>
    request('PATCH', `/api/tasks/${id}`, {
      body: updateTaskInputSchema.parse(input),
      schema: taskSchema,
    }),
  delete: (id: string) => request<void>('DELETE', `/api/tasks/${id}`, { expectVoid: true }),
  complete: (id: string, input: CompleteTaskInput) =>
    request('POST', `/api/tasks/${id}/complete`, {
      body: completeTaskInputSchema.parse(input),
      schema: completeTaskResponseSchema,
    }),
  missionMap: (filters?: { areaId?: string; goalId?: string }) =>
    request('GET', '/api/tasks/mission-map', {
      query: filters,
      schema: missionMapResponseSchema,
    }),
  addDependency: (taskId: string, dependsOnId: string) =>
    request('POST', `/api/tasks/${taskId}/dependencies`, {
      body: { dependsOnId },
      schema: z.object({
        id: z.string(),
        taskId: z.string(),
        dependsOnId: z.string(),
        createdAt: z.string(),
      }),
    }),
  reorder: (input: ReorderInput) =>
    request<void>('POST', '/api/tasks/reorder', {
      body: reorderInputSchema.parse(input),
      expectVoid: true,
    }),
  createRecurrence: (taskId: string, input: CreateRecurrenceInput) =>
    request('POST', `/api/tasks/${taskId}/recurrence`, {
      body: createRecurrenceInputSchema.parse(input),
      schema: recurrenceSchema,
    }),
  updateRecurrence: (taskId: string, input: Partial<CreateRecurrenceInput>) =>
    request('PATCH', `/api/tasks/${taskId}/recurrence`, {
      body: input,
      schema: recurrenceSchema,
    }),
  deleteRecurrence: (taskId: string) =>
    request<void>('DELETE', `/api/tasks/${taskId}/recurrence`, { expectVoid: true }),
};

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------

export const apiProblems = {
  list: (filters?: { status?: string; areaId?: string }) =>
    request('GET', '/api/problems', { query: filters, schema: z.array(problemSchema) }),
  get: (id: string) => request('GET', `/api/problems/${id}`, { schema: problemSchema }),
  create: (input: CreateProblemInput) =>
    request('POST', '/api/problems', {
      body: createProblemInputSchema.parse(input),
      schema: problemSchema,
    }),
  update: (id: string, input: UpdateProblemInput) =>
    request('PATCH', `/api/problems/${id}`, {
      body: updateProblemInputSchema.parse(input),
      schema: problemSchema,
    }),
  delete: (id: string) => request<void>('DELETE', `/api/problems/${id}`, { expectVoid: true }),
};

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export const apiLogs = {
  list: (filters?: { areaId?: string; kind?: string; limit?: number }) =>
    request('GET', '/api/logs', { query: filters, schema: z.array(logSchema) }),
  create: (input: CreateLogInput) =>
    request('POST', '/api/logs', { body: createLogInputSchema.parse(input), schema: logSchema }),
};

// ---------------------------------------------------------------------------
// Study topics
// ---------------------------------------------------------------------------

export const apiStudyTopics = {
  list: (filters?: { areaId?: string }) =>
    request('GET', '/api/study-topics', { query: filters, schema: z.array(studyTopicSchema) }),
  create: (input: CreateStudyTopicInput) =>
    request('POST', '/api/study-topics', {
      body: createStudyTopicInputSchema.parse(input),
      schema: studyTopicSchema,
    }),
  update: (id: string, input: UpdateStudyTopicInput) =>
    request('PATCH', `/api/study-topics/${id}`, {
      body: updateStudyTopicInputSchema.parse(input),
      schema: studyTopicSchema,
    }),
  delete: (id: string) =>
    request<void>('DELETE', `/api/study-topics/${id}`, { expectVoid: true }),
};

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export const apiResources = {
  list: (filters?: {
    areaId?: string;
    trackId?: string;
    goalId?: string;
    studyTopicId?: string;
    type?: string;
    q?: string;
  }) =>
    request('GET', '/api/resources', { query: filters, schema: z.array(resourceSchema) }),
  create: (input: CreateResourceInput) =>
    request('POST', '/api/resources', {
      body: createResourceInputSchema.parse(input),
      schema: resourceSchema,
    }),
  update: (id: string, input: UpdateResourceInput) =>
    request('PATCH', `/api/resources/${id}`, {
      body: updateResourceInputSchema.parse(input),
      schema: resourceSchema,
    }),
  delete: (id: string) => request<void>('DELETE', `/api/resources/${id}`, { expectVoid: true }),
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const apiDashboard = {
  get: (): Promise<DashboardResponse> =>
    request('GET', '/api/dashboard', { schema: dashboardResponseSchema }),
};

export const apiOverview = {
  get: () => request('GET', '/api/overview', { schema: overviewResponseSchema }),
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const apiSearch = {
  query: (q: string, types?: Array<string>, summarize = true) =>
    request('GET', '/api/search', {
      query: { q, types, summarize },
      schema: searchResponseSchema,
    }),
};

// ---------------------------------------------------------------------------
// AI / Navigator
// ---------------------------------------------------------------------------

export const apiAI = {
  parse: (text: string, correction?: string) =>
    request('POST', '/api/ai/parse', {
      body: parseInputSchema.parse({ text, correction }),
      schema: parseResponseSchema,
    }),
  confirm: (input: ConfirmParseInput) =>
    request('POST', '/api/ai/confirm', {
      body: confirmParseInputSchema.parse(input),
      schema: confirmParseResponseSchema,
    }),
  nextAction: (input: { availableMinutes?: number; context?: string }) =>
    request('POST', '/api/ai/next-action', { body: input, schema: nextActionResponseSchema }),
  breakdownGoal: (goalId: string) =>
    request('POST', '/api/ai/breakdown-goal', {
      body: { goalId },
      schema: goalBreakdownResponseSchema,
    }),
  solveProblem: (problemId: string) =>
    request('POST', '/api/ai/solve-problem', {
      body: { problemId },
      schema: solveProblemResponseSchema,
    }),
  overviewBriefing: (snapshot: OverviewResponse) =>
    request('POST', '/api/ai/overview-briefing', {
      body: { snapshot },
      schema: overviewBriefingResponseSchema,
    }),
};

export const apiSettings = {
  status: () => request('GET', '/api/settings/status', { schema: settingsStatusSchema }),
  get: () => request('GET', '/api/settings', { schema: settingsSchema }),
  update: (input: SettingsPatchInput) =>
    request('PATCH', '/api/settings', {
      body: settingsPatchInputSchema.parse(input),
      schema: settingsSchema,
    }),
  testAi: (input?: {
    provider?: 'openai' | 'ollama';
    openaiModel?: string;
    ollamaModel?: string;
    ollamaBaseUrl?: string;
  }) =>
    request('POST', '/api/settings/ai/test', {
      body: input ?? {},
      schema: z.object({
        provider: z.enum(['openai', 'ollama']),
        ok: z.boolean(),
        model: z.string(),
        latencyMs: z.number(),
        error: z.string().optional(),
      }),
    }),
  pairTelegram: () =>
    request('POST', '/api/settings/telegram/pair', {
      schema: z.object({
        pairingCode: z.string(),
        expiresAt: z.string(),
        botUsername: z.string().nullable(),
      }),
    }),
  testTelegram: () => request('POST', '/api/settings/telegram/test', { schema: z.object({ ok: z.boolean() }) }),
};

export const apiIngest = {
  spec: () => request('GET', '/api/ingest/spec', { schema: ingestSpecSchema }),
  import: (body: unknown) => {
    const parsed = ingestInputSchema.parse(body);
    return request('POST', '/api/ingest', {
      body: parsed,
      schema: ingestResponseSchema,
    });
  },
};

export const apiBackup = {
  downloadExport: async (): Promise<void> => {
    const url = buildUrl('/api/backup/export');
    const res = await fetch(url);
    if (!res.ok) {
      throw new ApiError(res.status, 'HTTP_ERROR', `Export failed: ${res.status}`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `command-center-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  },
  import: (body: unknown) => {
    const parsed = backupPayloadSchema.parse(body);
    return request('POST', '/api/backup/import', {
      body: parsed,
      schema: backupImportResponseSchema,
    });
  },
};

export const apiIntegrations = {
  googleAuthUrl: () =>
    request('GET', '/api/integrations/google/auth-url', {
      schema: z.object({ url: z.string().url() }),
    }),
  googleDisconnect: () => request('POST', '/api/integrations/google/disconnect', { schema: z.object({ ok: z.boolean() }) }),
  googleStatus: () =>
    request('GET', '/api/integrations/google/status', { schema: googleIntegrationStatusSchema }),
  googleSettings: (patch: IntegrationSettingsPatch) =>
    request('PATCH', '/api/integrations/google/settings', {
      body: integrationSettingsPatchSchema.parse(patch),
      schema: z.object({
        emailHashtag: z.string(),
        gmailPollMinutes: z.number(),
        calendarPollMinutes: z.number(),
        calendarDailyWriteCap: z.number(),
      }),
    }),
  googleScan: () => request('POST', '/api/integrations/google/scan', { schema: scanResultSchema }),
};

export const apiTrackedTags = {
  list: () => request('GET', '/api/tracked-tags', { schema: z.array(trackedTagSchema) }),
  create: (input: CreateTrackedTagInput) =>
    request('POST', '/api/tracked-tags', {
      body: createTrackedTagInputSchema.parse(input),
      schema: trackedTagSchema,
    }),
  update: (id: string, input: UpdateTrackedTagInput) =>
    request('PATCH', `/api/tracked-tags/${id}`, {
      body: updateTrackedTagInputSchema.parse(input),
      schema: trackedTagSchema,
    }),
  delete: (id: string) => request<void>('DELETE', `/api/tracked-tags/${id}`, { expectVoid: true }),
};

export const apiSidebarFeed = {
  list: () => request('GET', '/api/sidebar-feed', { schema: sidebarFeedResponseSchema }),
  createGroup: (input: CreateFeedGroupInput) =>
    request('POST', '/api/sidebar-feed/groups', {
      body: createFeedGroupInputSchema.parse(input),
      schema: feedGroupSchema,
    }),
  updateGroup: (id: string, input: UpdateFeedGroupInput) =>
    request('PATCH', `/api/sidebar-feed/groups/${id}`, {
      body: updateFeedGroupInputSchema.parse(input),
      schema: feedGroupSchema,
    }),
  deleteGroup: (id: string) =>
    request<void>('DELETE', `/api/sidebar-feed/groups/${id}`, { expectVoid: true }),
  createItem: (input: CreateFeedItemInput) =>
    request('POST', '/api/sidebar-feed/items', {
      body: createFeedItemInputSchema.parse(input),
      schema: feedItemSchema,
    }),
  updateItem: (id: string, input: UpdateFeedItemInput) =>
    request('PATCH', `/api/sidebar-feed/items/${id}`, {
      body: updateFeedItemInputSchema.parse(input),
      schema: feedItemSchema,
    }),
  deleteItem: (id: string) =>
    request<void>('DELETE', `/api/sidebar-feed/items/${id}`, { expectVoid: true }),
};

export const apiUrgency = {
  get: () => request('GET', '/api/urgency', { schema: urgencyResponseSchema }),
};

export const apiStreak = {
  get: (areaId?: string) =>
    request('GET', '/api/streak', {
      query: areaId ? { areaId } : undefined,
      schema: streakResponseSchema,
    }),
};

export const apiPendingCaptures = {
  list: () => request('GET', '/api/pending-captures', { schema: z.array(pendingCaptureSchema) }),
  count: () => request('GET', '/api/pending-captures/count', { schema: z.object({ count: z.number().int() }) }),
  answer: (id: string, input: AnswerPendingCaptureInput) =>
    request('POST', `/api/pending-captures/${id}/answer`, {
      body: answerPendingCaptureInputSchema.parse(input),
      schema: pendingCaptureSchema,
    }),
  dismiss: (id: string) =>
    request('POST', `/api/pending-captures/${id}/dismiss`, { schema: pendingCaptureSchema }),
  snooze: (id: string, days = 1) =>
    request('POST', `/api/pending-captures/${id}/snooze`, {
      body: { days },
      schema: pendingCaptureSchema,
    }),
};

export const apiCalendar = {
  addTask: (taskId: string) =>
    request('POST', `/api/calendar/tasks/${taskId}`, {
      schema: z.object({ eventId: z.string(), htmlLink: z.string().nullable() }),
    }),
  addReminder: (reminderId: string) =>
    request('POST', `/api/calendar/reminders/${reminderId}`, {
      schema: z.object({ eventId: z.string(), htmlLink: z.string().nullable() }),
    }),
};

export const apiReminders = {
  list: (limit = 5) => request('GET', '/api/reminders', { query: { limit }, schema: z.array(reminderSchema) }),
  markSent: (id: string) => request('POST', `/api/reminders/${id}/mark-sent`, { schema: reminderSchema }),
  cancel: (id: string) => request('POST', `/api/reminders/${id}/cancel`, { schema: reminderSchema }),
  snooze: (id: string, minutes: number) =>
    request('POST', `/api/reminders/${id}/snooze`, { body: { minutes }, schema: reminderSchema }),
};

// ---------------------------------------------------------------------------
// Focus tracker
// ---------------------------------------------------------------------------

export const apiFocus = {
  listSessions: (range: FocusRange = 'all') =>
    request('GET', '/api/focus/sessions', { query: { range }, schema: z.array(focusSessionSchema) }),
  suggestLinks: (input: FocusSuggestInput) =>
    request('POST', '/api/focus/sessions/suggest', {
      body: focusSuggestInputSchema.parse(input),
      schema: focusSuggestResponseSchema,
    }),
  createSession: (input: CreateFocusSessionInput) =>
    request('POST', '/api/focus/sessions', {
      body: createFocusSessionInputSchema.parse(input),
      schema: focusSessionSchema,
    }),
  getStats: (range: FocusRange = 'week') =>
    request('GET', '/api/focus/stats', { query: { range }, schema: focusStatsSchema }),
  getLatestInsight: () =>
    request('GET', '/api/focus/insights/latest', {
      schema: focusInsightSchema.nullable(),
    }),
  generateInsight: (options?: { force?: boolean }) =>
    request('POST', '/api/focus/insights/generate', {
      query: options?.force ? { force: true } : undefined,
      schema: focusInsightSchema,
    }),
};

// Re-export response types for consumer convenience
export type {
  Area,
  ConfirmParseResponse,
  DashboardResponse,
  GoalBreakdownResponse,
  Goal,
  Log,
  NextActionResponse,
  ParseResponse,
  Problem,
  Resource,
  SearchResponse,
  SolveProblemResponse,
  StudyTopic,
  Task,
  Track,
};
