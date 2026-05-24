import { z } from 'zod';
import { idSchema } from './common.js';
import { taskSchema } from './task.js';

export const taskDependencySchema = z.object({
  id: idSchema,
  taskId: idSchema,
  dependsOnId: idSchema,
  createdAt: z.string(),
});
export type TaskDependency = z.infer<typeof taskDependencySchema>;

export const createTaskDependencyInputSchema = z.object({
  dependsOnId: idSchema,
});
export type CreateTaskDependencyInput = z.infer<typeof createTaskDependencyInputSchema>;

export const taskDependencyNodeSchema = z.object({
  task: taskSchema,
  locked: z.boolean(),
  incompletePrerequisites: z.array(taskSchema),
});
export type TaskDependencyNode = z.infer<typeof taskDependencyNodeSchema>;

export const missionMapResponseSchema = z.object({
  nodes: z.array(taskDependencyNodeSchema),
  edges: z.array(
    z.object({
      id: idSchema,
      fromTaskId: idSchema,
      toTaskId: idSchema,
    }),
  ),
});
export type MissionMapResponse = z.infer<typeof missionMapResponseSchema>;

export const completeTaskResponseSchema = z.object({
  task: taskSchema,
  warnings: z.array(z.string()),
});
export type CompleteTaskResponse = z.infer<typeof completeTaskResponseSchema>;
