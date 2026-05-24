import { Router } from 'express';
import { z } from 'zod';
import {
  createStudyTopicInputSchema,
  updateStudyTopicInputSchema,
} from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  createStudyTopic,
  deleteStudyTopic,
  getStudyTopic,
  listStudyTopics,
  updateStudyTopic,
} from '../services/studyService.js';

const idParamSchema = z.object({ id: z.string().min(1) });
const listQuerySchema = z.object({ areaId: z.string().min(1).optional() });

export const studyTopicsRouter = Router();

studyTopicsRouter.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) =>
    res.json(await listStudyTopics(req.query as { areaId?: string })),
  ),
);

studyTopicsRouter.post(
  '/',
  validate(createStudyTopicInputSchema),
  asyncHandler(async (req, res) => res.status(201).json(await createStudyTopic(req.body))),
);

studyTopicsRouter.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) =>
    res.json(await getStudyTopic((req.params as { id: string }).id)),
  ),
);

studyTopicsRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateStudyTopicInputSchema),
  asyncHandler(async (req, res) =>
    res.json(await updateStudyTopic((req.params as { id: string }).id, req.body)),
  ),
);

studyTopicsRouter.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteStudyTopic((req.params as { id: string }).id);
    res.status(204).send();
  }),
);
