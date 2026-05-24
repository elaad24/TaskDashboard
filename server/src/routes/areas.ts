import { Router } from 'express';
import { z } from 'zod';
import {
  createAreaInputSchema,
  createTrackInputSchema,
  updateAreaInputSchema,
} from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  createArea,
  createTrack,
  deleteArea,
  getArea,
  listAreas,
  listTracks,
  updateArea,
} from '../services/areaService.js';

const idParamSchema = z.object({ id: z.string().min(1) });

export const areasRouter = Router();

areasRouter.get('/', asyncHandler(async (_req, res) => res.json(await listAreas())));

areasRouter.post(
  '/',
  validate(createAreaInputSchema),
  asyncHandler(async (req, res) => res.status(201).json(await createArea(req.body))),
);

areasRouter.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => res.json(await getArea((req.params as { id: string }).id))),
);

areasRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateAreaInputSchema),
  asyncHandler(async (req, res) =>
    res.json(await updateArea((req.params as { id: string }).id, req.body)),
  ),
);

areasRouter.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteArea((req.params as { id: string }).id);
    res.status(204).send();
  }),
);

// -- Tracks (nested under /areas/tracks) -----------------------------------

const tracksQuerySchema = z.object({ areaId: z.string().min(1).optional() });

export const tracksRouter = Router();

tracksRouter.get(
  '/',
  validate(tracksQuerySchema, 'query'),
  asyncHandler(async (req, res) =>
    res.json(await listTracks((req.query as { areaId?: string }).areaId)),
  ),
);

tracksRouter.post(
  '/',
  validate(createTrackInputSchema),
  asyncHandler(async (req, res) => res.status(201).json(await createTrack(req.body))),
);
