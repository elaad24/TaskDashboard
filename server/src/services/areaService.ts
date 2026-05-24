import type { CreateAreaInput, UpdateAreaInput } from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { serializeArea } from '../utils/serialize.js';

export const listAreas = async () => {
  const areas = await prisma.area.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
  return areas.map(serializeArea);
};

export const getArea = async (id: string) => {
  const area = await prisma.area.findUnique({ where: { id } });
  if (!area) throw new HttpError(404, 'AREA_NOT_FOUND', 'Area not found');
  return serializeArea(area);
};

export const createArea = async (input: CreateAreaInput) => {
  const area = await prisma.area.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      status: input.status ?? 'active',
      order: input.order ?? 0,
    },
  });
  return serializeArea(area);
};

export const updateArea = async (id: string, input: UpdateAreaInput) => {
  await getArea(id);
  const area = await prisma.area.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.color !== undefined && { color: input.color ?? null }),
      ...(input.icon !== undefined && { icon: input.icon ?? null }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.order !== undefined && { order: input.order }),
    },
  });
  return serializeArea(area);
};

export const deleteArea = async (id: string) => {
  await getArea(id);
  await prisma.area.delete({ where: { id } });
};

// -- Tracks ----------------------------------------------------------------

export const listTracks = async (areaId?: string) => {
  const tracks = await prisma.track.findMany({
    where: areaId ? { areaId } : undefined,
    orderBy: { name: 'asc' },
  });
  return tracks.map((t) => ({
    id: t.id,
    areaId: t.areaId,
    name: t.name,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
};

export const createTrack = async (input: { areaId: string; name: string; description?: string }) => {
  const area = await prisma.area.findUnique({ where: { id: input.areaId } });
  if (!area) throw new HttpError(404, 'AREA_NOT_FOUND', 'Area not found');
  const track = await prisma.track.create({
    data: {
      areaId: input.areaId,
      name: input.name,
      description: input.description ?? null,
    },
  });
  return {
    id: track.id,
    areaId: track.areaId,
    name: track.name,
    description: track.description,
    createdAt: track.createdAt.toISOString(),
    updatedAt: track.updatedAt.toISOString(),
  };
};
