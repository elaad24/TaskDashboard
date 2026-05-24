import type { MissionMapResponse, TaskDependency } from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { serializeTask } from '../utils/serialize.js';

const isOpenStatus = (status: string): boolean => status !== 'done' && status !== 'cancelled';

const wouldCreateCycle = async (taskId: string, dependsOnId: string): Promise<boolean> => {
  if (taskId === dependsOnId) return true;

  const visited = new Set<string>();
  const queue = [dependsOnId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const deps = await prisma.taskDependency.findMany({
      where: { taskId: current },
      select: { dependsOnId: true },
    });
    deps.forEach((d) => queue.push(d.dependsOnId));
  }

  return false;
};

export const listTaskDependencies = async (taskId: string): Promise<Array<TaskDependency>> => {
  const rows = await prisma.taskDependency.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    taskId: row.taskId,
    dependsOnId: row.dependsOnId,
    createdAt: row.createdAt.toISOString(),
  }));
};

export const listTaskDependents = async (taskId: string): Promise<Array<TaskDependency>> => {
  const rows = await prisma.taskDependency.findMany({
    where: { dependsOnId: taskId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    taskId: row.taskId,
    dependsOnId: row.dependsOnId,
    createdAt: row.createdAt.toISOString(),
  }));
};

export const addTaskDependency = async (
  taskId: string,
  dependsOnId: string,
): Promise<TaskDependency> => {
  const [task, dependsOn] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId } }),
    prisma.task.findUnique({ where: { id: dependsOnId } }),
  ]);
  if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  if (!dependsOn) throw new HttpError(404, 'TASK_NOT_FOUND', 'Prerequisite task not found');
  if (await wouldCreateCycle(taskId, dependsOnId)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Cannot create circular dependency');
  }

  const row = await prisma.taskDependency.create({
    data: { taskId, dependsOnId },
  });
  return {
    id: row.id,
    taskId: row.taskId,
    dependsOnId: row.dependsOnId,
    createdAt: row.createdAt.toISOString(),
  };
};

export const removeTaskDependency = async (taskId: string, dependencyId: string): Promise<void> => {
  const row = await prisma.taskDependency.findFirst({
    where: { id: dependencyId, taskId },
  });
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Dependency not found');
  await prisma.taskDependency.delete({ where: { id: dependencyId } });
};

export const getIncompletePrerequisites = async (taskId: string) => {
  const deps = await prisma.taskDependency.findMany({
    where: { taskId },
    include: { dependsOn: true },
  });
  return deps
    .map((d) => d.dependsOn)
    .filter((t) => isOpenStatus(t.status));
};

export const buildMissionMap = async (filters?: {
  areaId?: string;
  goalId?: string;
}): Promise<MissionMapResponse> => {
  const tasks = await prisma.task.findMany({
    where: {
      status: { notIn: ['cancelled'] },
      isRecurringTemplate: false,
      ...(filters?.areaId ? { areaId: filters.areaId } : {}),
      ...(filters?.goalId ? { goalId: filters.goalId } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { priorityScore: 'desc' }],
    take: 40,
  });

  const taskIds = tasks.map((t) => t.id);
  const edges = await prisma.taskDependency.findMany({
    where: {
      taskId: { in: taskIds },
      dependsOnId: { in: taskIds },
    },
  });

  const nodes = await Promise.all(
    tasks.map(async (task) => {
      const incomplete = await getIncompletePrerequisites(task.id);
      return {
        task: serializeTask(task),
        locked: incomplete.length > 0,
        incompletePrerequisites: incomplete.map(serializeTask),
      };
    }),
  );

  return {
    nodes,
    edges: edges.map((e) => ({
      id: e.id,
      fromTaskId: e.dependsOnId,
      toTaskId: e.taskId,
    })),
  };
};
