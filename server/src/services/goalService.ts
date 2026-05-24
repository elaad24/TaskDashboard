import type { CreateGoalInput, UpdateGoalInput } from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { serializeGoal } from '../utils/serialize.js';

export const listGoals = async (filters?: { status?: string; areaId?: string }) => {
  const goals = await prisma.goal.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.areaId && { areaId: filters.areaId }),
    },
    orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
  });
  return goals.map(serializeGoal);
};

export const getGoal = async (id: string) => {
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) throw new HttpError(404, 'GOAL_NOT_FOUND', 'Goal not found');
  return serializeGoal(goal);
};

export const createGoal = async (input: CreateGoalInput) => {
  const maxOrder = await prisma.goal.aggregate({ _max: { sortOrder: true } });
  const goal = await prisma.goal.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      areaId: input.areaId ?? null,
      trackId: input.trackId ?? null,
      status: input.status ?? 'active',
      priority: input.priority ?? 'medium',
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      progress: input.progress ?? 0,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      nextAction: input.nextAction ?? null,
      notes: input.notes ?? null,
    },
  });
  return serializeGoal(goal);
};

export const updateGoal = async (id: string, input: UpdateGoalInput) => {
  await getGoal(id);
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.areaId !== undefined && { areaId: input.areaId ?? null }),
      ...(input.trackId !== undefined && { trackId: input.trackId ?? null }),
      ...(input.status !== undefined && {
        status: input.status,
        ...(input.status === 'done' && { completedAt: new Date(), progress: 100 }),
      }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.targetDate !== undefined && {
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
      }),
      ...(input.nextAction !== undefined && { nextAction: input.nextAction ?? null }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
    },
  });
  return serializeGoal(goal);
};

export const deleteGoal = async (id: string) => {
  await getGoal(id);
  await prisma.goal.delete({ where: { id } });
};

export const reorderGoals = async (orderedIds: Array<string>) => {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.goal.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
};
