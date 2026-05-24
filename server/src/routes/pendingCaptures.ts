import { Router } from 'express';
import { z } from 'zod';
import {
  answerPendingCaptureInputSchema,
  pendingCaptureSchema,
} from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  answerPendingCapture,
  countPendingCaptures,
  dismissPendingCapture,
  listPendingCaptures,
  snoozePendingCapture,
} from '../services/pendingCaptureService.js';

const idParamSchema = z.object({ id: z.string().min(1) });
const snoozeBodySchema = z.object({ days: z.number().int().min(1).max(30).optional() });

export const pendingCapturesRouter = Router();

pendingCapturesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const captures = await listPendingCaptures();
    res.json(captures.map((capture) => pendingCaptureSchema.parse(capture)));
  }),
);

pendingCapturesRouter.get(
  '/count',
  asyncHandler(async (_req, res) => {
    const count = await countPendingCaptures();
    res.json({ count });
  }),
);

pendingCapturesRouter.post(
  '/:id/answer',
  validate(idParamSchema, 'params'),
  validate(answerPendingCaptureInputSchema),
  asyncHandler(async (req, res) => {
    const input = answerPendingCaptureInputSchema.parse(req.body);
    const capture = await answerPendingCapture((req.params as { id: string }).id, input);
    res.json(pendingCaptureSchema.parse(capture));
  }),
);

pendingCapturesRouter.post(
  '/:id/dismiss',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const capture = await dismissPendingCapture((req.params as { id: string }).id);
    res.json(pendingCaptureSchema.parse(capture));
  }),
);

pendingCapturesRouter.post(
  '/:id/snooze',
  validate(idParamSchema, 'params'),
  validate(snoozeBodySchema),
  asyncHandler(async (req, res) => {
    const body = snoozeBodySchema.parse(req.body);
    const capture = await snoozePendingCapture((req.params as { id: string }).id, body.days ?? 1);
    res.json(pendingCaptureSchema.parse(capture));
  }),
);
