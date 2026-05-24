import type { CreateProblemInput, UpdateProblemInput } from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { serializeProblem } from '../utils/serialize.js';

export const listProblems = async (filters?: { status?: string; areaId?: string }) => {
  const problems = await prisma.problem.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.areaId && { areaId: filters.areaId }),
    },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
  });
  return problems.map(serializeProblem);
};

export const getProblem = async (id: string) => {
  const p = await prisma.problem.findUnique({ where: { id } });
  if (!p) throw new HttpError(404, 'PROBLEM_NOT_FOUND', 'Problem not found');
  return serializeProblem(p);
};

export const createProblem = async (input: CreateProblemInput) => {
  const p = await prisma.problem.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      areaId: input.areaId ?? null,
      trackId: input.trackId ?? null,
      goalId: input.goalId ?? null,
      status: input.status ?? 'open',
      priority: input.priority ?? 'medium',
      aiInterpretation: input.aiInterpretation ?? null,
      suggestedPlan: input.suggestedPlan ?? null,
    },
  });
  return serializeProblem(p);
};

export const updateProblem = async (id: string, input: UpdateProblemInput) => {
  await getProblem(id);
  const p = await prisma.problem.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.areaId !== undefined && { areaId: input.areaId ?? null }),
      ...(input.trackId !== undefined && { trackId: input.trackId ?? null }),
      ...(input.goalId !== undefined && { goalId: input.goalId ?? null }),
      ...(input.status !== undefined && {
        status: input.status,
        ...(input.status === 'resolved' && { resolvedAt: new Date() }),
      }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.aiInterpretation !== undefined && { aiInterpretation: input.aiInterpretation ?? null }),
      ...(input.suggestedPlan !== undefined && { suggestedPlan: input.suggestedPlan ?? null }),
    },
  });
  return serializeProblem(p);
};

export const deleteProblem = async (id: string) => {
  await getProblem(id);
  await prisma.problem.delete({ where: { id } });
};
