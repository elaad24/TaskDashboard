import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildDashboard } from '../services/dashboardService.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  asyncHandler(async (_req, res) => res.json(await buildDashboard())),
);
