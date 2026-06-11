import { Router } from 'express';
import { backupImportResponseSchema, backupPayloadSchema } from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { exportAllData, importBackup } from '../services/backupService.js';

export const backupRouter = Router();

backupRouter.get(
  '/export',
  asyncHandler(async (_req, res) => {
    const payload = await exportAllData();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="command-center-backup-${date}.json"`);
    res.json(payload);
  }),
);

backupRouter.post(
  '/import',
  validate(backupPayloadSchema),
  asyncHandler(async (req, res) => {
    const result = await importBackup(req.body);
    res.json(backupImportResponseSchema.parse(result));
  }),
);
