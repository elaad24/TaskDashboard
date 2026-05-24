import { Router } from 'express';
import { z } from 'zod';
import {
  answerPendingCaptureInputSchema,
  createTrackedTagInputSchema,
  trackedTagSchema,
  updateTrackedTagInputSchema,
} from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  createTrackedTag,
  deleteTrackedTag,
  listTrackedTags,
  updateTrackedTag,
} from '../services/trackedTagService.js';

const idParamSchema = z.object({ id: z.string().min(1) });

export const trackedTagsRouter = Router();

trackedTagsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const tags = await listTrackedTags();
    res.json(tags.map((tag) => trackedTagSchema.parse(tag)));
  }),
);

trackedTagsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createTrackedTagInputSchema.parse(req.body);
    const tag = await createTrackedTag(input);
    res.status(201).json(trackedTagSchema.parse(tag));
  }),
);

trackedTagsRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateTrackedTagInputSchema),
  asyncHandler(async (req, res) => {
    const input = updateTrackedTagInputSchema.parse(req.body);
    const tag = await updateTrackedTag((req.params as { id: string }).id, input);
    res.json(trackedTagSchema.parse(tag));
  }),
);

trackedTagsRouter.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteTrackedTag((req.params as { id: string }).id);
    res.status(204).end();
  }),
);
