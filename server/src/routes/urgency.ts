import { Router } from 'express';
import { urgencyResponseSchema } from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildUrgency } from '../services/urgencyService.js';

export const urgencyRouter = Router();

urgencyRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const data = await buildUrgency();
    res.json(urgencyResponseSchema.parse(data));
  }),
);
