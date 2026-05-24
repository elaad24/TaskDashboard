import { z } from 'zod';
import { areaStatusSchema, idSchema, isoDateString } from './common.js';

export const areaSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable(),
  color: z.string().max(32).nullable(),
  icon: z.string().max(64).nullable(),
  status: areaStatusSchema,
  order: z.number().int(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type Area = z.infer<typeof areaSchema>;

export const createAreaInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
  status: areaStatusSchema.optional(),
  order: z.number().int().optional(),
});
export type CreateAreaInput = z.infer<typeof createAreaInputSchema>;

export const updateAreaInputSchema = createAreaInputSchema.partial();
export type UpdateAreaInput = z.infer<typeof updateAreaInputSchema>;

export const trackSchema = z.object({
  id: idSchema,
  areaId: idSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type Track = z.infer<typeof trackSchema>;

export const createTrackInputSchema = z.object({
  areaId: idSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});
export type CreateTrackInput = z.infer<typeof createTrackInputSchema>;

export const updateTrackInputSchema = createTrackInputSchema.partial().extend({
  id: idSchema.optional(),
});
export type UpdateTrackInput = z.infer<typeof updateTrackInputSchema>;
