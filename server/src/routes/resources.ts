import { Router } from 'express';
import { z } from 'zod';
import {
  createResourceInputSchema,
  updateResourceInputSchema,
} from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  createResource,
  deleteResource,
  listResources,
  updateResource,
} from '../services/resourceService.js';

const idParamSchema = z.object({ id: z.string().min(1) });
const listQuerySchema = z.object({
  areaId: z.string().min(1).optional(),
  trackId: z.string().min(1).optional(),
  goalId: z.string().min(1).optional(),
  studyTopicId: z.string().min(1).optional(),
  type: z.enum(['link', 'note', 'file']).optional(),
  q: z.string().min(1).optional(),
});

export const resourcesRouter = Router();

resourcesRouter.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) =>
    res.json(
      await listResources(
        req.query as {
          areaId?: string;
          trackId?: string;
          goalId?: string;
          studyTopicId?: string;
          type?: string;
          q?: string;
        },
      ),
    ),
  ),
);

resourcesRouter.post(
  '/',
  validate(createResourceInputSchema),
  asyncHandler(async (req, res) => res.status(201).json(await createResource(req.body))),
);

resourcesRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateResourceInputSchema),
  asyncHandler(async (req, res) =>
    res.json(await updateResource((req.params as { id: string }).id, req.body)),
  ),
);

resourcesRouter.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteResource((req.params as { id: string }).id);
    res.status(204).send();
  }),
);
