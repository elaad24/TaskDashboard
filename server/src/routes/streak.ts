import { Router } from 'express';
import { z } from 'zod';
import { streakResponseSchema } from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildStreak } from '../services/streakService.js';

const querySchema = z.object({
  areaId: z.string().min(1).optional(),
});

export const streakRouter = Router();

streakRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = querySchema.parse(req.query);
    const data = await buildStreak(query.areaId ?? null);
    res.json(streakResponseSchema.parse(data));
  }),
);
