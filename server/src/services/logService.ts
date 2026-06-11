import type { CreateLogInput } from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { serializeLog } from '../utils/serialize.js';
import { convertToEur } from './currencyService.js';

export const listLogs = async (filters?: { areaId?: string; kind?: string; limit?: number }) => {
  const logs = await prisma.log.findMany({
    where: {
      ...(filters?.areaId && { areaId: filters.areaId }),
      ...(filters?.kind && { kind: filters.kind }),
    },
    orderBy: { occurredAt: 'desc' },
    take: filters?.limit ?? 200,
  });
  return logs.map(serializeLog);
};

export const getLog = async (id: string) => {
  const log = await prisma.log.findUnique({ where: { id } });
  if (!log) throw new HttpError(404, 'LOG_NOT_FOUND', 'Log not found');
  return serializeLog(log);
};

export const createLog = async (input: CreateLogInput) => {
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  let costAmountEur: number | null = null;

  if (input.costAmount != null) {
    try {
      costAmountEur = await convertToEur(
        input.costAmount,
        input.costCurrency ?? 'EUR',
        occurredAt.toISOString(),
      );
    } catch {
      // If FX lookup fails, still persist the log; budget falls back to raw amount.
      costAmountEur = null;
    }
  }

  const log = await prisma.log.create({
    data: {
      title: input.title,
      content: input.content ?? null,
      kind: input.kind,
      areaId: input.areaId ?? null,
      trackId: input.trackId ?? null,
      goalId: input.goalId ?? null,
      taskId: input.taskId ?? null,
      problemId: input.problemId ?? null,
      studyTopicId: input.studyTopicId ?? null,
      timeSpentMinutes: input.timeSpentMinutes ?? null,
      costAmount: input.costAmount ?? null,
      costCurrency: input.costCurrency ?? null,
      costAmountEur,
      occurredAt,
    },
  });
  return serializeLog(log);
};
