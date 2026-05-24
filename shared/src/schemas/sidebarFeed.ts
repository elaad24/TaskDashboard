import { z } from 'zod';
import { idSchema, isoDateString } from './common.js';

export const feedItemSchema = z.object({
  id: idSchema,
  groupId: idSchema,
  content: z.string().min(1).max(2000),
  excludedFromRotation: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type FeedItem = z.infer<typeof feedItemSchema>;

export type FeedGroup = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  items: Array<FeedItem>;
  children: Array<FeedGroup>;
};

export const feedGroupSchema: z.ZodType<FeedGroup> = z.lazy(() =>
  z.object({
    id: idSchema,
    name: z.string().min(1).max(120),
    parentId: idSchema.nullable(),
    sortOrder: z.number().int(),
    createdAt: isoDateString,
    updatedAt: isoDateString,
    items: z.array(feedItemSchema),
    children: z.array(feedGroupSchema),
  }),
);

export const sidebarFeedResponseSchema = z.object({
  groups: z.array(feedGroupSchema),
});
export type SidebarFeedResponse = z.infer<typeof sidebarFeedResponseSchema>;

export const createFeedGroupInputSchema = z.object({
  name: z.string().min(1).max(120),
  parentId: idSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateFeedGroupInput = z.infer<typeof createFeedGroupInputSchema>;

export const updateFeedGroupInputSchema = createFeedGroupInputSchema.partial();
export type UpdateFeedGroupInput = z.infer<typeof updateFeedGroupInputSchema>;

export const createFeedItemInputSchema = z.object({
  groupId: idSchema,
  content: z.string().min(1).max(2000),
  excludedFromRotation: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateFeedItemInput = z.infer<typeof createFeedItemInputSchema>;

export const updateFeedItemInputSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  excludedFromRotation: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  groupId: idSchema.optional(),
});
export type UpdateFeedItemInput = z.infer<typeof updateFeedItemInputSchema>;

/** Collect every leaf item across the folder tree. */
export const collectFeedItems = (groups: Array<FeedGroup>): Array<FeedItem> =>
  groups.flatMap((group) => [...group.items, ...collectFeedItems(group.children)]);

/** Items eligible for sidebar rotation (exclude checkbox is off). */
export const collectRotationPool = (groups: Array<FeedGroup>): Array<FeedItem> =>
  groups.flatMap((group) => [
    ...group.items.filter((item) => !item.excludedFromRotation),
    ...collectRotationPool(group.children),
  ]);

export const countFeedItems = (groups: Array<FeedGroup>): number =>
  groups.reduce((sum, group) => sum + group.items.length + countFeedItems(group.children), 0);
