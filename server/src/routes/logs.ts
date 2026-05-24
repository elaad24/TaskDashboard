import { Router } from 'express';
import { z } from 'zod';
import { createLogInputSchema } from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { createLog, getLog, listLogs } from '../services/logService.js';

const listQuerySchema = z.object({
  areaId: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });

export const logsRouter = Router();

logsRouter.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) =>
    res.json(await listLogs(req.query as { areaId?: string; kind?: string; limit?: number })),
  ),
);

logsRouter.post(
  '/',
  validate(createLogInputSchema),
  asyncHandler(async (req, res) => res.status(201).json(await createLog(req.body))),
);

logsRouter.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => res.json(await getLog((req.params as { id: string }).id))),
);
