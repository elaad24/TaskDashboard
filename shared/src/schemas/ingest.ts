import { z } from 'zod';
import { createGoalInputSchema } from './goal.js';
import { createLogInputSchema } from './log.js';
import { createProblemInputSchema } from './problem.js';
import { createResourceInputSchema } from './resource.js';
import { createStudyTopicInputSchema } from './study.js';
import { createTaskInputSchema } from './task.js';
import { idSchema } from './common.js';

/** Optional human-readable links resolved server-side to areaId / trackId. */
const ingestLinkFields = {
  areaName: z.string().min(1).max(120).optional(),
  trackName: z.string().min(1).max(120).optional(),
};

export const ingestTaskItemSchema = createTaskInputSchema.extend(ingestLinkFields);
export const ingestGoalItemSchema = createGoalInputSchema.extend(ingestLinkFields);
export const ingestProblemItemSchema = createProblemInputSchema.extend(ingestLinkFields);
export const ingestLogItemSchema = createLogInputSchema.extend(ingestLinkFields);
export const ingestStudyTopicItemSchema = createStudyTopicInputSchema.extend(ingestLinkFields);
export const ingestResourceItemSchema = createResourceInputSchema.extend(ingestLinkFields);

export const ingestInputSchema = z.object({
  tasks: z.array(ingestTaskItemSchema).max(100).optional(),
  goals: z.array(ingestGoalItemSchema).max(50).optional(),
  problems: z.array(ingestProblemItemSchema).max(50).optional(),
  logs: z.array(ingestLogItemSchema).max(100).optional(),
  studyTopics: z.array(ingestStudyTopicItemSchema).max(50).optional(),
  resources: z.array(ingestResourceItemSchema).max(50).optional(),
  /** When true, validate and resolve links but do not persist. */
  dryRun: z.boolean().optional(),
});
export type IngestInput = z.infer<typeof ingestInputSchema>;

export const ingestErrorSchema = z.object({
  collection: z.string(),
  index: z.number().int().min(0),
  message: z.string(),
});

export const ingestResponseSchema = z.object({
  dryRun: z.boolean(),
  createdTaskIds: z.array(idSchema),
  createdGoalIds: z.array(idSchema),
  createdProblemIds: z.array(idSchema),
  createdLogIds: z.array(idSchema),
  createdStudyTopicIds: z.array(idSchema),
  createdResourceIds: z.array(idSchema),
  warnings: z.array(z.string()),
  errors: z.array(ingestErrorSchema),
});
export type IngestResponse = z.infer<typeof ingestResponseSchema>;

export const ingestAreaRefSchema = z.object({
  id: idSchema,
  name: z.string(),
});

export const ingestSpecSchema = z.object({
  method: z.literal('POST'),
  path: z.literal('/api/ingest'),
  contentType: z.literal('application/json'),
  areas: z.array(ingestAreaRefSchema),
  aiAgentPrompt: z.string(),
  exampleRequest: ingestInputSchema,
  notes: z.array(z.string()),
});
export type IngestSpec = z.infer<typeof ingestSpecSchema>;
