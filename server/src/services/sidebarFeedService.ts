import type {
  CreateFeedGroupInput,
  CreateFeedItemInput,
  FeedGroup,
  FeedItem,
  SidebarFeedResponse,
  UpdateFeedGroupInput,
  UpdateFeedItemInput,
} from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  CURATED_MOTIVATION_FOLDERS,
  CURATED_MOTIVATION_ROOT,
} from './sidebarFeedCuratedQuotes.js';

type FeedGroupRow = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type FeedItemRow = {
  id: string;
  groupId: string;
  content: string;
  excludedFromRotation: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

const serializeFeedItem = (row: FeedItemRow): FeedItem => ({
  id: row.id,
  groupId: row.groupId,
  content: row.content,
  excludedFromRotation: row.excludedFromRotation,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const sortItems = (items: Array<FeedItemRow>): Array<FeedItem> =>
  items
    .map(serializeFeedItem)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));

const buildFeedTree = (
  rows: Array<FeedGroupRow & { items: Array<FeedItemRow> }>,
): Array<FeedGroup> => {
  const byParent = new Map<string | null, Array<FeedGroupRow & { items: Array<FeedItemRow> }>>();

  for (const row of rows) {
    const key = row.parentId ?? null;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(row);
    else byParent.set(key, [row]);
  }

  const buildLevel = (parentId: string | null): Array<FeedGroup> => {
    const nodes = byParent.get(parentId) ?? [];
    return nodes
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((row) => ({
        id: row.id,
        name: row.name,
        parentId: row.parentId,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        items: sortItems(row.items),
        children: buildLevel(row.id),
      }));
  };

  return buildLevel(null);
};

const serializeFeedGroup = (
  row: FeedGroupRow,
  items: Array<FeedItemRow>,
  children: Array<FeedGroup> = [],
): FeedGroup => ({
  id: row.id,
  name: row.name,
  parentId: row.parentId,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  items: sortItems(items),
  children,
});

const ensureDefaultSidebarFeed = async (): Promise<void> => {
  const count = await prisma.feedGroup.count();
  if (count > 0) return;

  const motivation = await prisma.feedGroup.create({
    data: { name: CURATED_MOTIVATION_ROOT, sortOrder: 0 },
  });

  for (const folder of CURATED_MOTIVATION_FOLDERS) {
    await prisma.feedGroup.create({
      data: {
        name: folder.name,
        parentId: motivation.id,
        sortOrder: folder.sortOrder,
        items: {
          create: folder.items.map((content, index) => ({
            content,
            sortOrder: index,
          })),
        },
      },
    });
  }

  await prisma.feedGroup.create({
    data: { name: 'Learning', sortOrder: 1 },
  });
};

const ensureCuratedMotivationQuotes = async (): Promise<void> => {
  let motivation = await prisma.feedGroup.findFirst({
    where: { name: CURATED_MOTIVATION_ROOT, parentId: null },
  });

  if (!motivation) {
    motivation = await prisma.feedGroup.create({
      data: { name: CURATED_MOTIVATION_ROOT, sortOrder: 0 },
    });
  }

  const existingContents = new Set(
    (await prisma.feedItem.findMany({ select: { content: true } })).map((row) => row.content),
  );

  for (const folder of CURATED_MOTIVATION_FOLDERS) {
    let group = await prisma.feedGroup.findFirst({
      where: { name: folder.name, parentId: motivation.id },
    });

    if (!group) {
      group = await prisma.feedGroup.create({
        data: {
          name: folder.name,
          parentId: motivation.id,
          sortOrder: folder.sortOrder,
        },
      });
    }

    const missing = folder.items.filter((content) => !existingContents.has(content));
    if (missing.length === 0) continue;

    const maxSort = await prisma.feedItem.aggregate({
      where: { groupId: group.id },
      _max: { sortOrder: true },
    });
    let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    for (const content of missing) {
      await prisma.feedItem.create({
        data: {
          groupId: group.id,
          content,
          sortOrder: nextSort,
        },
      });
      existingContents.add(content);
      nextSort += 1;
    }
  }
};

const assertValidParent = async (parentId: string, groupId?: string): Promise<void> => {
  const parent = await prisma.feedGroup.findUnique({ where: { id: parentId } });
  if (!parent) throw new HttpError(404, 'NOT_FOUND', 'Parent folder not found');
  if (groupId && parentId === groupId) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'A folder cannot be its own parent');
  }

  if (!groupId) return;

  let cursor: string | null = parentId;
  while (cursor) {
    if (cursor === groupId) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Cannot move a folder into its own descendant');
    }
    const node: { parentId: string | null } | null = await prisma.feedGroup.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = node?.parentId ?? null;
  }
};

export const listSidebarFeed = async (): Promise<SidebarFeedResponse> => {
  await ensureDefaultSidebarFeed();
  await ensureCuratedMotivationQuotes();

  const groups = await prisma.feedGroup.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      items: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  });

  return { groups: buildFeedTree(groups) };
};

export const createFeedGroup = async (input: CreateFeedGroupInput): Promise<FeedGroup> => {
  if (input.parentId) await assertValidParent(input.parentId);

  const row = await prisma.feedGroup.create({
    data: {
      name: input.name.trim(),
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  return serializeFeedGroup(row, []);
};

export const updateFeedGroup = async (id: string, input: UpdateFeedGroupInput): Promise<FeedGroup> => {
  const existing = await prisma.feedGroup.findUnique({ where: { id }, include: { items: true } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feed group not found');

  if (input.parentId !== undefined && input.parentId !== null) {
    await assertValidParent(input.parentId, id);
  }

  const row = await prisma.feedGroup.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    },
  });
  return serializeFeedGroup(row, existing.items);
};

export const deleteFeedGroup = async (id: string): Promise<void> => {
  const existing = await prisma.feedGroup.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feed group not found');
  await prisma.feedGroup.delete({ where: { id } });
};

export const createFeedItem = async (input: CreateFeedItemInput): Promise<FeedItem> => {
  const group = await prisma.feedGroup.findUnique({ where: { id: input.groupId } });
  if (!group) throw new HttpError(404, 'NOT_FOUND', 'Feed group not found');

  const row = await prisma.feedItem.create({
    data: {
      groupId: input.groupId,
      content: input.content.trim(),
      excludedFromRotation: input.excludedFromRotation ?? false,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  return serializeFeedItem(row);
};

export const updateFeedItem = async (id: string, input: UpdateFeedItemInput): Promise<FeedItem> => {
  const existing = await prisma.feedItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feed item not found');

  if (input.groupId !== undefined) {
    const group = await prisma.feedGroup.findUnique({ where: { id: input.groupId } });
    if (!group) throw new HttpError(404, 'NOT_FOUND', 'Feed group not found');
  }

  const row = await prisma.feedItem.update({
    where: { id },
    data: {
      ...(input.content !== undefined ? { content: input.content.trim() } : {}),
      ...(input.excludedFromRotation !== undefined
        ? { excludedFromRotation: input.excludedFromRotation }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
    },
  });
  return serializeFeedItem(row);
};

export const deleteFeedItem = async (id: string): Promise<void> => {
  const existing = await prisma.feedItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feed item not found');
  await prisma.feedItem.delete({ where: { id } });
};
