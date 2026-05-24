import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildOverview } from '../services/overviewService.js';

export const overviewRouter = Router();

overviewRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await buildOverview());
  }),
);
