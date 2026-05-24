import { Router } from 'express';
import { z } from 'zod';
import {
  createFeedGroupInputSchema,
  createFeedItemInputSchema,
  feedGroupSchema,
  feedItemSchema,
  sidebarFeedResponseSchema,
  updateFeedGroupInputSchema,
  updateFeedItemInputSchema,
} from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  createFeedGroup,
  createFeedItem,
  deleteFeedGroup,
  deleteFeedItem,
  listSidebarFeed,
  updateFeedGroup,
  updateFeedItem,
} from '../services/sidebarFeedService.js';

const idParamSchema = z.object({ id: z.string().min(1) });

export const sidebarFeedRouter = Router();

sidebarFeedRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const feed = await listSidebarFeed();
    res.json(sidebarFeedResponseSchema.parse(feed));
  }),
);

sidebarFeedRouter.post(
  '/groups',
  validate(createFeedGroupInputSchema),
  asyncHandler(async (req, res) => {
    const input = createFeedGroupInputSchema.parse(req.body);
    const group = await createFeedGroup(input);
    res.status(201).json(feedGroupSchema.parse(group));
  }),
);

sidebarFeedRouter.patch(
  '/groups/:id',
  validate(idParamSchema, 'params'),
  validate(updateFeedGroupInputSchema),
  asyncHandler(async (req, res) => {
    const input = updateFeedGroupInputSchema.parse(req.body);
    const group = await updateFeedGroup((req.params as { id: string }).id, input);
    res.json(feedGroupSchema.parse(group));
  }),
);

sidebarFeedRouter.delete(
  '/groups/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteFeedGroup((req.params as { id: string }).id);
    res.status(204).end();
  }),
);

sidebarFeedRouter.post(
  '/items',
  validate(createFeedItemInputSchema),
  asyncHandler(async (req, res) => {
    const input = createFeedItemInputSchema.parse(req.body);
    const item = await createFeedItem(input);
    res.status(201).json(feedItemSchema.parse(item));
  }),
);

sidebarFeedRouter.patch(
  '/items/:id',
  validate(idParamSchema, 'params'),
  validate(updateFeedItemInputSchema),
  asyncHandler(async (req, res) => {
    const input = updateFeedItemInputSchema.parse(req.body);
    const item = await updateFeedItem((req.params as { id: string }).id, input);
    res.json(feedItemSchema.parse(item));
  }),
);

sidebarFeedRouter.delete(
  '/items/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteFeedItem((req.params as { id: string }).id);
    res.status(204).end();
  }),
);
