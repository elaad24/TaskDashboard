import { z } from 'zod';
import { confidenceSchema, idSchema, isoDateString } from './common.js';

export const studyTopicSchema = z.object({
  id: idSchema,
  subject: z.string().min(1).max(200),
  topic: z.string().min(1).max(200),
  confidence: confidenceSchema,
  mockScore: z.number().int().min(0).max(100).nullable(),
  weakTopics: z.array(z.string()),
  totalMinutes: z.number().int(),
  areaId: idSchema.nullable(),
  trackId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  notes: z.string().max(8000).nullable(),
  lastStudiedAt: isoDateString.nullable(),
  nextReviewAt: isoDateString.nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type StudyTopic = z.infer<typeof studyTopicSchema>;

export const createStudyTopicInputSchema = z.object({
  subject: z.string().min(1).max(200),
  topic: z.string().min(1).max(200),
  confidence: confidenceSchema.optional(),
  mockScore: z.number().int().min(0).max(100).optional().nullable(),
  weakTopics: z.array(z.string().min(1).max(200)).optional(),
  totalMinutes: z.number().int().min(0).optional(),
  areaId: idSchema.optional().nullable(),
  trackId: idSchema.optional().nullable(),
  goalId: idSchema.optional().nullable(),
  notes: z.string().max(8000).optional(),
  lastStudiedAt: isoDateString.optional().nullable(),
  nextReviewAt: isoDateString.optional().nullable(),
});
export type CreateStudyTopicInput = z.infer<typeof createStudyTopicInputSchema>;

export const updateStudyTopicInputSchema = createStudyTopicInputSchema.partial();
export type UpdateStudyTopicInput = z.infer<typeof updateStudyTopicInputSchema>;
