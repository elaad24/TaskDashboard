import type { AskFields, CreateTrackedTagInput, TrackedTag, UpdateTrackedTagInput } from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';

type TrackedTagRow = {
  id: string;
  name: string;
  aliases: string;
  areaId: string | null;
  askFields: string;
  defaultLogKind: string;
  autoLog: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const parseJson = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const serializeTrackedTag = (row: TrackedTagRow): TrackedTag => ({
  id: row.id,
  name: row.name,
  aliases: parseJson<Array<string>>(row.aliases, []),
  areaId: row.areaId,
  askFields: parseJson<AskFields>(row.askFields, {}),
  defaultLogKind: row.defaultLogKind as TrackedTag['defaultLogKind'],
  autoLog: row.autoLog,
  active: row.active,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const matchTrackedTag = async (text: string) => {
  const tags = await prisma.trackedTag.findMany({ where: { active: true } });
  const haystack = text.toLowerCase();
  for (const tag of tags) {
    const aliases = parseJson<Array<string>>(tag.aliases, []);
    const candidates = [tag.name, ...aliases];
    for (const candidate of candidates) {
      const pattern = new RegExp(`\\b${escapeRegex(candidate.toLowerCase())}\\b`, 'i');
      if (pattern.test(haystack)) {
        return serializeTrackedTag(tag);
      }
    }
  }
  return null;
};

export const listTrackedTags = async (): Promise<Array<TrackedTag>> => {
  const rows = await prisma.trackedTag.findMany({ orderBy: { name: 'asc' } });
  return rows.map(serializeTrackedTag);
};

export const createTrackedTag = async (input: CreateTrackedTagInput): Promise<TrackedTag> => {
  const row = await prisma.trackedTag.create({
    data: {
      name: input.name.trim(),
      aliases: JSON.stringify(input.aliases ?? []),
      areaId: input.areaId ?? null,
      askFields: JSON.stringify(input.askFields ?? {}),
      defaultLogKind: input.defaultLogKind ?? 'note',
      autoLog: input.autoLog ?? false,
      active: input.active ?? true,
    },
  });
  return serializeTrackedTag(row);
};

export const updateTrackedTag = async (id: string, input: UpdateTrackedTagInput): Promise<TrackedTag> => {
  const existing = await prisma.trackedTag.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Tracked tag not found');
  const row = await prisma.trackedTag.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.aliases !== undefined ? { aliases: JSON.stringify(input.aliases) } : {}),
      ...(input.areaId !== undefined ? { areaId: input.areaId } : {}),
      ...(input.askFields !== undefined ? { askFields: JSON.stringify(input.askFields) } : {}),
      ...(input.defaultLogKind !== undefined ? { defaultLogKind: input.defaultLogKind } : {}),
      ...(input.autoLog !== undefined ? { autoLog: input.autoLog } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
  return serializeTrackedTag(row);
};

export const deleteTrackedTag = async (id: string): Promise<void> => {
  await prisma.trackedTag.delete({ where: { id } });
};
