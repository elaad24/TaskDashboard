import { Router } from 'express';
import { z } from 'zod';
import {
  completeTaskInputSchema,
  createRecurrenceInputSchema,
  createTaskDependencyInputSchema,
  createTaskInputSchema,
  completeTaskResponseSchema,
  missionMapResponseSchema,
  reorderInputSchema,
  taskDependencySchema,
  taskFiltersSchema,
  updateRecurrenceInputSchema,
  updateTaskInputSchema,
} from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import {
  completeTask,
  createTask,
  createTasksBulk,
  deleteTask,
  getTask,
  listTasks,
  reorderTasks,
  updateTask,
} from '../services/taskService.js';
import { cancelRecurrence, createRecurrence, updateRecurrence } from '../services/recurrenceService.js';
import {
  addTaskDependency,
  buildMissionMap,
  listTaskDependents,
  listTaskDependencies,
  removeTaskDependency,
} from '../services/dependencyService.js';

const idParamSchema = z.object({ id: z.string().min(1) });
const depParamSchema = z.object({ id: z.string().min(1), depId: z.string().min(1) });
const mapQuerySchema = z.object({
  areaId: z.string().min(1).optional(),
  goalId: z.string().min(1).optional(),
});

export const tasksRouter = Router();

tasksRouter.get(
  '/',
  validate(taskFiltersSchema, 'query'),
  asyncHandler(async (req, res) => res.json(await listTasks(req.query))),
);

tasksRouter.post(
  '/',
  validate(createTaskInputSchema),
  asyncHandler(async (req, res) => res.status(201).json(await createTask(req.body))),
);

tasksRouter.post(
  '/bulk',
  validate(z.object({ tasks: z.array(createTaskInputSchema).min(1).max(50) })),
  asyncHandler(async (req, res) =>
    res.status(201).json(await createTasksBulk((req.body as { tasks: Array<unknown> }).tasks as never)),
  ),
);

tasksRouter.post(
  '/reorder',
  validate(reorderInputSchema),
  asyncHandler(async (req, res) => {
    await reorderTasks((req.body as { orderedIds: Array<string> }).orderedIds);
    res.status(204).send();
  }),
);

tasksRouter.get(
  '/mission-map',
  validate(mapQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = mapQuerySchema.parse(req.query);
    const map = await buildMissionMap(query);
    res.json(missionMapResponseSchema.parse(map));
  }),
);

tasksRouter.get(
  '/:id/dependencies',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) =>
    res.json(await listTaskDependencies((req.params as { id: string }).id)),
  ),
);

tasksRouter.get(
  '/:id/dependents',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) =>
    res.json(await listTaskDependents((req.params as { id: string }).id)),
  ),
);

tasksRouter.post(
  '/:id/dependencies',
  validate(idParamSchema, 'params'),
  validate(createTaskDependencyInputSchema),
  asyncHandler(async (req, res) => {
    const body = createTaskDependencyInputSchema.parse(req.body);
    const dep = await addTaskDependency((req.params as { id: string }).id, body.dependsOnId);
    res.status(201).json(taskDependencySchema.parse(dep));
  }),
);

tasksRouter.delete(
  '/:id/dependencies/:depId',
  validate(depParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const params = depParamSchema.parse(req.params);
    await removeTaskDependency(params.id, params.depId);
    res.status(204).send();
  }),
);

tasksRouter.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => res.json(await getTask((req.params as { id: string }).id))),
);

tasksRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateTaskInputSchema),
  asyncHandler(async (req, res) =>
    res.json(await updateTask((req.params as { id: string }).id, req.body)),
  ),
);

tasksRouter.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteTask((req.params as { id: string }).id);
    res.status(204).send();
  }),
);

tasksRouter.post(
  '/:id/recurrence',
  validate(idParamSchema, 'params'),
  validate(createRecurrenceInputSchema),
  asyncHandler(async (req, res) =>
    res.status(201).json(await createRecurrence((req.params as { id: string }).id, req.body)),
  ),
);

tasksRouter.patch(
  '/:id/recurrence',
  validate(idParamSchema, 'params'),
  validate(updateRecurrenceInputSchema),
  asyncHandler(async (req, res) =>
    res.json(await updateRecurrence((req.params as { id: string }).id, req.body)),
  ),
);

tasksRouter.delete(
  '/:id/recurrence',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await cancelRecurrence((req.params as { id: string }).id);
    res.status(204).send();
  }),
);

tasksRouter.post(
  '/:id/complete',
  validate(idParamSchema, 'params'),
  validate(completeTaskInputSchema),
  asyncHandler(async (req, res) => {
    const result = await completeTask((req.params as { id: string }).id, req.body);
    res.json(completeTaskResponseSchema.parse(result));
  }),
);
