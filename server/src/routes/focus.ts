import { Router } from 'express';
import { z } from 'zod';
import {
  createFocusSessionInputSchema,
  focusRangeSchema,
  focusSuggestInputSchema,
} from '@command-center/shared';
import type { FocusRange } from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  createFocusSession,
  getFocusStats,
  getLatestFocusInsight,
  getOrGenerateFocusInsight,
  listFocusSessions,
  suggestFocusLinks,
} from '../services/focusService.js';

const sessionsQuerySchema = z.object({
  range: focusRangeSchema.optional().default('all'),
});

const statsQuerySchema = z.object({
  range: focusRangeSchema.optional().default('week'),
});

export const focusRouter = Router();

focusRouter.get(
  '/sessions',
  validate(sessionsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { range } = req.query as { range: FocusRange };
    res.json(await listFocusSessions(range));
  }),
);

focusRouter.post(
  '/sessions/suggest',
  validate(focusSuggestInputSchema),
  asyncHandler(async (req, res) => {
    res.json(await suggestFocusLinks(req.body));
  }),
);

focusRouter.post(
  '/sessions',
  validate(createFocusSessionInputSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createFocusSession(req.body));
  }),
);

focusRouter.get(
  '/stats',
  validate(statsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { range } = req.query as { range: FocusRange };
    res.json(await getFocusStats(range));
  }),
);

focusRouter.get(
  '/insights/latest',
  asyncHandler(async (_req, res) => {
    res.json(await getLatestFocusInsight());
  }),
);

focusRouter.post(
  '/insights/generate',
  asyncHandler(async (_req, res) => {
    res.json(await getOrGenerateFocusInsight());
  }),
);
