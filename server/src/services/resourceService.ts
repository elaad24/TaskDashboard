import type { CreateResourceInput, UpdateResourceInput } from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { serializeResource } from '../utils/serialize.js';

export const listResources = async (filters?: {
  areaId?: string;
  trackId?: string;
  goalId?: string;
  studyTopicId?: string;
  type?: string;
  q?: string;
}) => {
  const resources = await prisma.resource.findMany({
    where: {
      ...(filters?.areaId && { areaId: filters.areaId }),
      ...(filters?.trackId && { trackId: filters.trackId }),
      ...(filters?.goalId && { goalId: filters.goalId }),
      ...(filters?.studyTopicId && { studyTopicId: filters.studyTopicId }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.q && {
        OR: [
          { title: { contains: filters.q } },
          { content: { contains: filters.q } },
          { url: { contains: filters.q } },
        ],
      }),
    },
    orderBy: { createdAt: 'desc' },
  });
  return resources.map(serializeResource);
};

export const createResource = async (input: CreateResourceInput) => {
  const r = await prisma.resource.create({
    data: {
      title: input.title,
      url: input.url ?? null,
      type: input.type ?? 'link',
      content: input.content ?? null,
      areaId: input.areaId ?? null,
      trackId: input.trackId ?? null,
      goalId: input.goalId ?? null,
      studyTopicId: input.studyTopicId ?? null,
    },
  });
  return serializeResource(r);
};

export const updateResource = async (id: string, input: UpdateResourceInput) => {
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  const r = await prisma.resource.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.url !== undefined && { url: input.url ?? null }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.content !== undefined && { content: input.content ?? null }),
      ...(input.areaId !== undefined && { areaId: input.areaId ?? null }),
      ...(input.trackId !== undefined && { trackId: input.trackId ?? null }),
      ...(input.goalId !== undefined && { goalId: input.goalId ?? null }),
      ...(input.studyTopicId !== undefined && { studyTopicId: input.studyTopicId ?? null }),
    },
  });
  return serializeResource(r);
};

export const deleteResource = async (id: string) => {
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  await prisma.resource.delete({ where: { id } });
};
