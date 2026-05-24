import { Router } from 'express';
import { ingestInputSchema, ingestResponseSchema, ingestSpecSchema } from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { buildIngestSpec, ingestPayload } from '../services/ingestService.js';

export const ingestRouter = Router();

ingestRouter.get(
  '/spec',
  asyncHandler(async (_req, res) => {
    const spec = await buildIngestSpec();
    res.json(ingestSpecSchema.parse(spec));
  }),
);

ingestRouter.post(
  '/',
  validate(ingestInputSchema),
  asyncHandler(async (req, res) => {
    const result = await ingestPayload(req.body);
    res.status(result.dryRun ? 200 : 201).json(ingestResponseSchema.parse(result));
  }),
);
