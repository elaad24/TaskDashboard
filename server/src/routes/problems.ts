import { Router } from 'express';
import { z } from 'zod';
import {
  createProblemInputSchema,
  updateProblemInputSchema,
} from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  createProblem,
  deleteProblem,
  getProblem,
  listProblems,
  updateProblem,
} from '../services/problemService.js';

const idParamSchema = z.object({ id: z.string().min(1) });
const listQuerySchema = z.object({
  status: z.string().min(1).optional(),
  areaId: z.string().min(1).optional(),
});

export const problemsRouter = Router();

problemsRouter.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) =>
    res.json(await listProblems(req.query as { status?: string; areaId?: string })),
  ),
);

problemsRouter.post(
  '/',
  validate(createProblemInputSchema),
  asyncHandler(async (req, res) => res.status(201).json(await createProblem(req.body))),
);

problemsRouter.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => res.json(await getProblem((req.params as { id: string }).id))),
);

problemsRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateProblemInputSchema),
  asyncHandler(async (req, res) =>
    res.json(await updateProblem((req.params as { id: string }).id, req.body)),
  ),
);

problemsRouter.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteProblem((req.params as { id: string }).id);
    res.status(204).send();
  }),
);
