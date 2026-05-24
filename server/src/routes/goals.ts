import { Router } from 'express';
import { z } from 'zod';
import { createGoalInputSchema, reorderInputSchema, updateGoalInputSchema } from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  reorderGoals,
  updateGoal,
} from '../services/goalService.js';

const idParamSchema = z.object({ id: z.string().min(1) });
const listQuerySchema = z.object({
  status: z.string().min(1).optional(),
  areaId: z.string().min(1).optional(),
});

export const goalsRouter = Router();

goalsRouter.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) =>
    res.json(await listGoals(req.query as { status?: string; areaId?: string })),
  ),
);

goalsRouter.post(
  '/',
  validate(createGoalInputSchema),
  asyncHandler(async (req, res) => res.status(201).json(await createGoal(req.body))),
);

goalsRouter.post(
  '/reorder',
  validate(reorderInputSchema),
  asyncHandler(async (req, res) => {
    await reorderGoals((req.body as { orderedIds: Array<string> }).orderedIds);
    res.status(204).send();
  }),
);

goalsRouter.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => res.json(await getGoal((req.params as { id: string }).id))),
);

goalsRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateGoalInputSchema),
  asyncHandler(async (req, res) =>
    res.json(await updateGoal((req.params as { id: string }).id, req.body)),
  ),
);

goalsRouter.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteGoal((req.params as { id: string }).id);
    res.status(204).send();
  }),
);
