import { z } from 'zod';
import { askFieldsSchema } from './trackedTags.js';
import { idSchema, isoDateString } from './common.js';

export const integrationProviderSchema = z.enum(['google']);

export const googleIntegrationStatusSchema = z.object({
  connected: z.boolean(),
  email: z.string().nullable().optional(),
  gmailLastSyncAt: isoDateString.nullable(),
  calendarLastSyncAt: isoDateString.nullable(),
  pendingCapturesCount: z.number().int(),
  emailHashtag: z.string(),
  gmailPollMinutes: z.number().int(),
  calendarPollMinutes: z.number().int(),
  calendarDailyWriteCap: z.number().int(),
  calendarWritesToday: z.number().int(),
});
export type GoogleIntegrationStatus = z.infer<typeof googleIntegrationStatusSchema>;

export const integrationSettingsPatchSchema = z.object({
  emailHashtag: z.string().min(1).max(40).regex(/^#/).optional(),
  gmailPollMinutes: z.number().int().min(1).max(120).optional(),
  calendarPollMinutes: z.number().int().min(5).max(240).optional(),
  calendarDailyWriteCap: z.number().int().min(1).max(100).optional(),
});
export type IntegrationSettingsPatch = z.infer<typeof integrationSettingsPatchSchema>;

export const pendingCaptureSchema = z.object({
  id: idSchema,
  source: z.enum(['email', 'calendar', 'manual']),
  sourceRef: z.string(),
  trackedTagId: idSchema.nullable(),
  trackedTagName: z.string().nullable().optional(),
  title: z.string(),
  snippet: z.string().nullable(),
  occurredAt: isoDateString.nullable(),
  suggestedAreaId: idSchema.nullable(),
  askFields: askFieldsSchema,
  status: z.enum(['pending', 'answered', 'dismissed']),
  snoozedUntil: isoDateString.nullable(),
  createdAt: isoDateString,
  answeredAt: isoDateString.nullable(),
});
export type PendingCapture = z.infer<typeof pendingCaptureSchema>;

export const answerPendingCaptureInputSchema = z.object({
  costAmount: z.number().min(0).optional(),
  costCurrency: z.string().max(8).optional(),
  timeSpentMinutes: z.number().int().min(0).max(60 * 24).optional(),
  location: z.string().max(200).optional(),
  counterparty: z.string().max(200).optional(),
  note: z.string().max(4000).optional(),
  createTask: z.boolean().optional(),
});
export type AnswerPendingCaptureInput = z.infer<typeof answerPendingCaptureInputSchema>;

export const scanResultSchema = z.object({
  gmailProcessed: z.number().int(),
  calendarProcessed: z.number().int(),
  capturesCreated: z.number().int(),
});
export type ScanResult = z.infer<typeof scanResultSchema>;
