import { z } from 'zod';

export const urgencyStatusSchema = z.enum(['ahead', 'on_track', 'behind', 'critical']);
export type UrgencyStatus = z.infer<typeof urgencyStatusSchema>;

export const urgencyMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  baseline: z.number(),
  deltaPct: z.number(),
  status: urgencyStatusSchema,
  unit: z.string().optional(),
  invert: z.boolean().optional(),
  trend14d: z.array(z.object({ date: z.string(), value: z.number() })),
});
export type UrgencyMetric = z.infer<typeof urgencyMetricSchema>;

export const urgencyResponseSchema = z.object({
  overallStatus: urgencyStatusSchema,
  summary: z.string(),
  overdueTasks: z.number().int().min(0),
  currency: z.string(),
  metrics: z.array(urgencyMetricSchema),
  generatedAt: z.string(),
});
export type UrgencyResponse = z.infer<typeof urgencyResponseSchema>;
