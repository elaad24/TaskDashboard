import {
  BACKUP_VERSION,
  type BackupImportResponse,
  type BackupPayload,
} from '@command-center/shared';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';

const DATE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'targetDate',
  'dueDate',
  'completedAt',
  'occurredAt',
  'lastStudiedAt',
  'nextReviewAt',
  'scheduledFor',
  'sentAt',
  'snoozedUntil',
  'startsOn',
  'endsOn',
  'lastMaterializedAt',
  'resolvedAt',
  'answeredAt',
  'expiresAt',
  'gmailLastSyncAt',
  'calendarLastSyncAt',
  'processedAt',
  'pairedAt',
  'pairingExpiresAt',
  'analyzedAt',
  'startedAt',
  'endedAt',
  'generatedAt',
]);

const emptyImportCounts = (): BackupImportResponse['imported'] => ({
  areas: 0,
  tracks: 0,
  goals: 0,
  tasks: 0,
  taskDependencies: 0,
  taskRecurrences: 0,
  problems: 0,
  logs: 0,
  studyTopics: 0,
  resources: 0,
  reminders: 0,
  trackedTags: 0,
  pendingCaptures: 0,
  feedGroups: 0,
  feedItems: 0,
  appSettings: 0,
  telegramSubscribers: 0,
  telegramInboxItems: 0,
  focusSessions: 0,
  focusInsights: 0,
  integrationTokens: 0,
  integrationScans: 0,
  aiThreads: 0,
  aiMessages: 0,
});

const serializeRecord = (record: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
};

const deserializeRecord = (record: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...record };
  for (const key of DATE_FIELDS) {
    const value = out[key];
    if (typeof value === 'string' && value.length > 0) {
      out[key] = new Date(value);
    }
  }
  return out;
};

type UpsertArgs = {
  where: Record<string, unknown>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

type UpsertFn = (args: UpsertArgs) => Promise<unknown>;

const runUpsert = async (
  upsert: UpsertFn,
  where: Record<string, unknown>,
  create: Record<string, unknown>,
  update: Record<string, unknown>,
) => {
  await upsert({ where, create, update });
};

const splitRow = (row: Record<string, unknown>, idField: 'id' | 'key') => {
  const idValue = row[idField];
  if (typeof idValue !== 'string' || !idValue) {
    throw new Error(`missing ${idField}`);
  }
  const data = { ...row };
  delete data[idField];
  return { idValue, data };
};

const upsertManyTx = async (
  label: string,
  rows: Array<Record<string, unknown>> | undefined,
  upsertFn: (row: Record<string, unknown>) => Promise<unknown>,
): Promise<number> => {
  if (!rows?.length) return 0;
  let count = 0;
  for (const raw of rows) {
    try {
      await upsertFn(deserializeRecord(raw));
      count += 1;
    } catch (err) {
      const id = String(raw.id ?? raw.key ?? '?');
      throw new HttpError(
        400,
        'BACKUP_IMPORT_FAILED',
        `${label}[${id}]: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }
  return count;
};

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const importPayloadInTransaction = async (
  tx: TxClient,
  payload: BackupPayload,
): Promise<BackupImportResponse['imported']> => {
  const imported = emptyImportCounts();

  imported.areas = await upsertManyTx('areas', payload.areas, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.area.upsert.bind(tx.area) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.tracks = await upsertManyTx('tracks', payload.tracks, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.track.upsert.bind(tx.track) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.goals = await upsertManyTx('goals', payload.goals, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.goal.upsert.bind(tx.goal) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.problems = await upsertManyTx('problems', payload.problems, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.problem.upsert.bind(tx.problem) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  const templateTasks = payload.tasks?.filter((task) => task.isRecurringTemplate === true) ?? [];
  const otherTasks = payload.tasks?.filter((task) => task.isRecurringTemplate !== true) ?? [];

  imported.tasks += await upsertManyTx('tasks', templateTasks, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.task.upsert.bind(tx.task) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.taskRecurrences = await upsertManyTx('taskRecurrences', payload.taskRecurrences, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.taskRecurrence.upsert.bind(tx.taskRecurrence) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.tasks += await upsertManyTx('tasks', otherTasks, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.task.upsert.bind(tx.task) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.taskDependencies = await upsertManyTx('taskDependencies', payload.taskDependencies, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.taskDependency.upsert.bind(tx.taskDependency) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.logs = await upsertManyTx('logs', payload.logs, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.log.upsert.bind(tx.log) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.studyTopics = await upsertManyTx('studyTopics', payload.studyTopics, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.studyTopic.upsert.bind(tx.studyTopic) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.resources = await upsertManyTx('resources', payload.resources, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.resource.upsert.bind(tx.resource) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.reminders = await upsertManyTx('reminders', payload.reminders, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.reminder.upsert.bind(tx.reminder) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.trackedTags = await upsertManyTx('trackedTags', payload.trackedTags, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.trackedTag.upsert.bind(tx.trackedTag) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.pendingCaptures = await upsertManyTx('pendingCaptures', payload.pendingCaptures, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.pendingCapture.upsert.bind(tx.pendingCapture) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.feedGroups = await upsertManyTx('feedGroups', payload.feedGroups, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.feedGroup.upsert.bind(tx.feedGroup) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.feedItems = await upsertManyTx('feedItems', payload.feedItems, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.feedItem.upsert.bind(tx.feedItem) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.appSettings = await upsertManyTx('appSettings', payload.appSettings, async (row) => {
    const { idValue, data } = splitRow(row, 'key');
    await runUpsert(
      tx.appSetting.upsert.bind(tx.appSetting) as unknown as UpsertFn,
      { key: idValue },
      { key: idValue, ...data },
      data,
    );
  });

  imported.telegramSubscribers = await upsertManyTx('telegramSubscribers', payload.telegramSubscribers, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.telegramSubscriber.upsert.bind(tx.telegramSubscriber) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.telegramInboxItems = await upsertManyTx('telegramInboxItems', payload.telegramInboxItems, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.telegramInboxItem.upsert.bind(tx.telegramInboxItem) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.aiThreads = await upsertManyTx('aiThreads', payload.aiThreads, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.aIThread.upsert.bind(tx.aIThread) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.aiMessages = await upsertManyTx('aiMessages', payload.aiMessages, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(tx.aIMessage.upsert.bind(tx.aIMessage) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  });

  imported.integrationTokens = await upsertManyTx('integrationTokens', payload.integrationTokens, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.integrationToken.upsert.bind(tx.integrationToken) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.integrationScans = await upsertManyTx('integrationScans', payload.integrationScans, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.integrationScan.upsert.bind(tx.integrationScan) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.focusSessions = await upsertManyTx('focusSessions', payload.focusSessions, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.focusSession.upsert.bind(tx.focusSession) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  imported.focusInsights = await upsertManyTx('focusInsights', payload.focusInsights, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      tx.focusInsight.upsert.bind(tx.focusInsight) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  });

  return imported;
};

export const exportAllData = async (): Promise<BackupPayload> => {
  const [
    areas,
    tracks,
    goals,
    tasks,
    taskDependencies,
    taskRecurrences,
    problems,
    logs,
    studyTopics,
    resources,
    reminders,
    trackedTags,
    pendingCaptures,
    feedGroups,
    feedItems,
    appSettings,
    telegramSubscribers,
    telegramInboxItems,
    focusSessions,
    focusInsights,
    integrationTokens,
    integrationScans,
    aiThreads,
    aiMessages,
  ] = await Promise.all([
    prisma.area.findMany({ orderBy: { order: 'asc' } }),
    prisma.track.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.goal.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.task.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.taskDependency.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.taskRecurrence.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.problem.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.log.findMany({ orderBy: { occurredAt: 'asc' } }),
    prisma.studyTopic.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.resource.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.reminder.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.trackedTag.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.pendingCapture.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.feedGroup.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.feedItem.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.appSetting.findMany({ orderBy: { key: 'asc' } }),
    prisma.telegramSubscriber.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.telegramInboxItem.findMany({ orderBy: { sentAt: 'asc' } }),
    prisma.focusSession.findMany({ orderBy: { startedAt: 'asc' } }),
    prisma.focusInsight.findMany({ orderBy: { generatedAt: 'asc' } }),
    prisma.integrationToken.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.integrationScan.findMany({ orderBy: { processedAt: 'asc' } }),
    prisma.aIThread.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.aIMessage.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);

  const mapRows = (rows: Array<Record<string, unknown>>) =>
    rows.map((row) => serializeRecord(row as unknown as Record<string, unknown>));

  return {
    meta: {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'command-center',
    },
    areas: mapRows(areas as unknown as Array<Record<string, unknown>>),
    tracks: mapRows(tracks as unknown as Array<Record<string, unknown>>),
    goals: mapRows(goals as unknown as Array<Record<string, unknown>>),
    tasks: mapRows(tasks as unknown as Array<Record<string, unknown>>),
    taskDependencies: mapRows(taskDependencies as unknown as Array<Record<string, unknown>>),
    taskRecurrences: mapRows(taskRecurrences as unknown as Array<Record<string, unknown>>),
    problems: mapRows(problems as unknown as Array<Record<string, unknown>>),
    logs: mapRows(logs as unknown as Array<Record<string, unknown>>),
    studyTopics: mapRows(studyTopics as unknown as Array<Record<string, unknown>>),
    resources: mapRows(resources as unknown as Array<Record<string, unknown>>),
    reminders: mapRows(reminders as unknown as Array<Record<string, unknown>>),
    trackedTags: mapRows(trackedTags as unknown as Array<Record<string, unknown>>),
    pendingCaptures: mapRows(pendingCaptures as unknown as Array<Record<string, unknown>>),
    feedGroups: mapRows(feedGroups as unknown as Array<Record<string, unknown>>),
    feedItems: mapRows(feedItems as unknown as Array<Record<string, unknown>>),
    appSettings: mapRows(appSettings as unknown as Array<Record<string, unknown>>),
    telegramSubscribers: mapRows(telegramSubscribers as unknown as Array<Record<string, unknown>>),
    telegramInboxItems: mapRows(telegramInboxItems as unknown as Array<Record<string, unknown>>),
    focusSessions: mapRows(focusSessions as unknown as Array<Record<string, unknown>>),
    focusInsights: mapRows(focusInsights as unknown as Array<Record<string, unknown>>),
    integrationTokens: mapRows(integrationTokens as unknown as Array<Record<string, unknown>>),
    integrationScans: mapRows(integrationScans as unknown as Array<Record<string, unknown>>),
    aiThreads: mapRows(aiThreads as unknown as Array<Record<string, unknown>>),
    aiMessages: mapRows(aiMessages as unknown as Array<Record<string, unknown>>),
  } as BackupPayload;
};

export const importBackup = async (payload: BackupPayload): Promise<BackupImportResponse> => {
  try {
    const imported = await prisma.$transaction(async (tx) => importPayloadInTransaction(tx, payload));
    return { imported, errors: [] };
  } catch (err) {
    if (err instanceof HttpError) {
      return { imported: emptyImportCounts(), errors: [err.message] };
    }
    throw err;
  }
};
