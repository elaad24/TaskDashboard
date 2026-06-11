import { z } from 'zod';

export const BACKUP_VERSION = 2 as const;

export const backupMetaSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.string().datetime(),
  app: z.literal('command-center'),
});

/** Rows must include an id; extra Prisma fields are allowed for forward compatibility. */
export const backupIdRowSchema = z.object({ id: z.string().min(1) }).passthrough();
export const backupKeyRowSchema = z.object({ key: z.string().min(1) }).passthrough();

const backupEntityArrays = {
  areas: z.array(backupIdRowSchema).optional(),
  tracks: z.array(backupIdRowSchema).optional(),
  goals: z.array(backupIdRowSchema).optional(),
  tasks: z.array(backupIdRowSchema).optional(),
  taskDependencies: z.array(backupIdRowSchema).optional(),
  taskRecurrences: z.array(backupIdRowSchema).optional(),
  problems: z.array(backupIdRowSchema).optional(),
  logs: z.array(backupIdRowSchema).optional(),
  studyTopics: z.array(backupIdRowSchema).optional(),
  resources: z.array(backupIdRowSchema).optional(),
  reminders: z.array(backupIdRowSchema).optional(),
  trackedTags: z.array(backupIdRowSchema).optional(),
  pendingCaptures: z.array(backupIdRowSchema).optional(),
  feedGroups: z.array(backupIdRowSchema).optional(),
  feedItems: z.array(backupIdRowSchema).optional(),
  appSettings: z.array(backupKeyRowSchema).optional(),
  telegramSubscribers: z.array(backupIdRowSchema).optional(),
  telegramInboxItems: z.array(backupIdRowSchema).optional(),
  focusSessions: z.array(backupIdRowSchema).optional(),
  focusInsights: z.array(backupIdRowSchema).optional(),
  integrationTokens: z.array(backupIdRowSchema).optional(),
  integrationScans: z.array(backupIdRowSchema).optional(),
  aiThreads: z.array(backupIdRowSchema).optional(),
  aiMessages: z.array(backupIdRowSchema).optional(),
};

export const backupImportCountsSchema = z.object({
  areas: z.number().int().min(0),
  tracks: z.number().int().min(0),
  goals: z.number().int().min(0),
  tasks: z.number().int().min(0),
  taskDependencies: z.number().int().min(0),
  taskRecurrences: z.number().int().min(0),
  problems: z.number().int().min(0),
  logs: z.number().int().min(0),
  studyTopics: z.number().int().min(0),
  resources: z.number().int().min(0),
  reminders: z.number().int().min(0),
  trackedTags: z.number().int().min(0),
  pendingCaptures: z.number().int().min(0),
  feedGroups: z.number().int().min(0),
  feedItems: z.number().int().min(0),
  appSettings: z.number().int().min(0),
  telegramSubscribers: z.number().int().min(0),
  telegramInboxItems: z.number().int().min(0),
  focusSessions: z.number().int().min(0),
  focusInsights: z.number().int().min(0),
  integrationTokens: z.number().int().min(0),
  integrationScans: z.number().int().min(0),
  aiThreads: z.number().int().min(0),
  aiMessages: z.number().int().min(0),
});

export const backupImportResponseSchema = z.object({
  imported: backupImportCountsSchema,
  errors: z.array(z.string()),
});
export type BackupImportResponse = z.infer<typeof backupImportResponseSchema>;

export const backupPayloadSchema = z.object({
  meta: backupMetaSchema,
  ...backupEntityArrays,
});
export type BackupPayload = z.infer<typeof backupPayloadSchema>;
