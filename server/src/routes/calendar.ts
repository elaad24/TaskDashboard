import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { createEventForReminder, createEventForTask } from '../integrations/google/calendarWriter.js';

const idParamSchema = z.object({ taskId: z.string().min(1) });
const reminderParamSchema = z.object({ reminderId: z.string().min(1) });

export const calendarRouter = Router();

calendarRouter.post(
  '/tasks/:taskId',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await createEventForTask((req.params as { taskId: string }).taskId);
    res.status(201).json(result);
  }),
);

calendarRouter.post(
  '/reminders/:reminderId',
  validate(reminderParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await createEventForReminder((req.params as { reminderId: string }).reminderId);
    res.status(201).json(result);
  }),
);
