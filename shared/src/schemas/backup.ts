import { z } from 'zod';

export const backupMetaSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  app: z.literal('command-center'),
});

export const backupImportResponseSchema = z.object({
  imported: z.object({
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
  }),
  errors: z.array(z.string()),
});
export type BackupImportResponse = z.infer<typeof backupImportResponseSchema>;

export const backupPayloadSchema = z
  .object({
    meta: backupMetaSchema,
    areas: z.array(z.record(z.unknown())).optional(),
    tracks: z.array(z.record(z.unknown())).optional(),
    goals: z.array(z.record(z.unknown())).optional(),
    tasks: z.array(z.record(z.unknown())).optional(),
    taskDependencies: z.array(z.record(z.unknown())).optional(),
    taskRecurrences: z.array(z.record(z.unknown())).optional(),
    problems: z.array(z.record(z.unknown())).optional(),
    logs: z.array(z.record(z.unknown())).optional(),
    studyTopics: z.array(z.record(z.unknown())).optional(),
    resources: z.array(z.record(z.unknown())).optional(),
    reminders: z.array(z.record(z.unknown())).optional(),
    trackedTags: z.array(z.record(z.unknown())).optional(),
    pendingCaptures: z.array(z.record(z.unknown())).optional(),
    feedGroups: z.array(z.record(z.unknown())).optional(),
    feedItems: z.array(z.record(z.unknown())).optional(),
    appSettings: z.array(z.record(z.unknown())).optional(),
    telegramSubscribers: z.array(z.record(z.unknown())).optional(),
    telegramInboxItems: z.array(z.record(z.unknown())).optional(),
  })
  .passthrough();
export type BackupPayload = z.infer<typeof backupPayloadSchema>;
