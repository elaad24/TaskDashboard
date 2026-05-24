import type { AnswerPendingCaptureInput, PendingCapture } from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { createLog } from './logService.js';
import { createTask } from './taskService.js';
import { serializeTrackedTag } from './trackedTagService.js';

const parseJson = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const serializePendingCapture = (row: {
  id: string;
  source: string;
  sourceRef: string;
  trackedTagId: string | null;
  title: string;
  snippet: string | null;
  occurredAt: Date | null;
  suggestedAreaId: string | null;
  askFields: string;
  status: string;
  snoozedUntil: Date | null;
  createdAt: Date;
  answeredAt: Date | null;
  trackedTag?: { name: string } | null;
}): PendingCapture => ({
  id: row.id,
  source: row.source as PendingCapture['source'],
  sourceRef: row.sourceRef,
  trackedTagId: row.trackedTagId,
  trackedTagName: row.trackedTag?.name ?? null,
  title: row.title,
  snippet: row.snippet,
  occurredAt: row.occurredAt?.toISOString() ?? null,
  suggestedAreaId: row.suggestedAreaId,
  askFields: parseJson(row.askFields, {}),
  status: row.status as PendingCapture['status'],
  snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  answeredAt: row.answeredAt?.toISOString() ?? null,
});

export const listPendingCaptures = async (): Promise<Array<PendingCapture>> => {
  const now = new Date();
  const rows = await prisma.pendingCapture.findMany({
    where: {
      status: 'pending',
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
    include: { trackedTag: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializePendingCapture);
};

export const countPendingCaptures = async (): Promise<number> => {
  const now = new Date();
  return prisma.pendingCapture.count({
    where: {
      status: 'pending',
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
  });
};

export const createPendingCapture = async (input: {
  source: PendingCapture['source'];
  sourceRef: string;
  trackedTagId?: string | null;
  title: string;
  snippet?: string | null;
  occurredAt?: Date | null;
  suggestedAreaId?: string | null;
  askFields?: Record<string, boolean>;
}): Promise<PendingCapture> => {
  const row = await prisma.pendingCapture.create({
    data: {
      source: input.source,
      sourceRef: input.sourceRef,
      trackedTagId: input.trackedTagId ?? null,
      title: input.title,
      snippet: input.snippet ?? null,
      occurredAt: input.occurredAt ?? null,
      suggestedAreaId: input.suggestedAreaId ?? null,
      askFields: JSON.stringify(input.askFields ?? {}),
    },
    include: { trackedTag: { select: { name: true } } },
  });
  return serializePendingCapture(row);
};

export const dismissPendingCapture = async (id: string): Promise<PendingCapture> => {
  const row = await prisma.pendingCapture.update({
    where: { id },
    data: { status: 'dismissed', answeredAt: new Date() },
    include: { trackedTag: { select: { name: true } } },
  });
  return serializePendingCapture(row);
};

export const snoozePendingCapture = async (id: string, days = 1): Promise<PendingCapture> => {
  const until = new Date();
  until.setDate(until.getDate() + days);
  const row = await prisma.pendingCapture.update({
    where: { id },
    data: { snoozedUntil: until },
    include: { trackedTag: { select: { name: true } } },
  });
  return serializePendingCapture(row);
};

export const answerPendingCapture = async (
  id: string,
  input: AnswerPendingCaptureInput,
): Promise<PendingCapture> => {
  const capture = await prisma.pendingCapture.findUnique({
    where: { id },
    include: { trackedTag: true },
  });
  if (!capture) throw new HttpError(404, 'NOT_FOUND', 'Pending capture not found');
  if (capture.status !== 'pending') {
    throw new HttpError(400, 'NOT_PENDING', 'Capture is no longer pending');
  }

  const tag = capture.trackedTag ? serializeTrackedTag(capture.trackedTag) : null;
  const areaId = capture.suggestedAreaId ?? tag?.areaId ?? undefined;
  const logKind =
    tag?.defaultLogKind === 'expense'
      ? 'expense'
      : tag?.defaultLogKind === 'study'
        ? 'study'
        : 'note';

  const noteParts = [
    input.note,
    input.location ? `Location: ${input.location}` : null,
    input.counterparty ? `With: ${input.counterparty}` : null,
    capture.snippet,
  ].filter(Boolean);

  await createLog({
    title: capture.title,
    content: noteParts.join('\n') || undefined,
    kind: logKind,
    areaId: areaId ?? null,
    costAmount: input.costAmount,
    costCurrency: input.costCurrency ?? 'EUR',
    timeSpentMinutes: input.timeSpentMinutes,
    occurredAt: capture.occurredAt?.toISOString(),
  });

  if (input.createTask) {
    await createTask({
      title: capture.title,
      description: noteParts.join('\n') || undefined,
      areaId: areaId ?? null,
      dueDate: capture.occurredAt?.toISOString(),
      source: 'manual',
    });
  }

  const row = await prisma.pendingCapture.update({
    where: { id },
    data: { status: 'answered', answeredAt: new Date(), snoozedUntil: null },
    include: { trackedTag: { select: { name: true } } },
  });
  return serializePendingCapture(row);
};
