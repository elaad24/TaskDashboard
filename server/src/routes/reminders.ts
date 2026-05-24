import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  cancelReminder,
  listUpcomingReminders,
  markReminderSent,
  snoozeReminder,
} from '../services/reminderService.js';
import { serializeReminder } from '../utils/serialize.js';

const idParamSchema = z.object({ id: z.string().min(1) });
const listQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(20).optional() });

export const remindersRouter = Router();

remindersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const reminders = await listUpcomingReminders(query.limit ?? 5);
    res.json(reminders.map(serializeReminder));
  }),
);

remindersRouter.post(
  '/:id/mark-sent',
  asyncHandler(async (req, res) => {
    const params = idParamSchema.parse(req.params);
    const reminder = await markReminderSent(params.id);
    res.json(serializeReminder(reminder));
  }),
);

remindersRouter.post(
  '/:id/snooze',
  asyncHandler(async (req, res) => {
    const params = idParamSchema.parse(req.params);
    const body = z.object({ minutes: z.number().int().min(1).max(60 * 24 * 7) }).parse(req.body);
    const until = new Date(Date.now() + body.minutes * 60 * 1000);
    const reminder = await snoozeReminder(params.id, until);
    res.json(serializeReminder(reminder));
  }),
);

remindersRouter.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const params = idParamSchema.parse(req.params);
    const reminder = await cancelReminder(params.id);
    res.json(serializeReminder(reminder));
  }),
);
