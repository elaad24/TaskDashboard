import type { BackupImportResponse, BackupPayload } from '@command-center/shared';
import { prisma } from '../db.js';

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
]);

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

const upsertMany = async (
  label: string,
  rows: Array<Record<string, unknown>> | undefined,
  upsertFn: (row: Record<string, unknown>) => Promise<unknown>,
  errors: Array<string>,
): Promise<number> => {
  if (!rows?.length) return 0;
  let count = 0;
  for (const raw of rows) {
    try {
      await upsertFn(deserializeRecord(raw));
      count += 1;
    } catch (err) {
      errors.push(`${label}[${String(raw.id ?? raw.key ?? '?')}]: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  return count;
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
  ]);

  const mapRows = (rows: Array<Record<string, unknown>>) =>
    rows.map((row) => serializeRecord(row as unknown as Record<string, unknown>));

  return {
    meta: {
      version: 1,
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
  };
};

export const importBackup = async (payload: BackupPayload): Promise<BackupImportResponse> => {
  const errors: Array<string> = [];
  const imported = {
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
  };

  imported.areas = await upsertMany('areas', payload.areas, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.area.upsert.bind(prisma.area) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.tracks = await upsertMany('tracks', payload.tracks, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.track.upsert.bind(prisma.track) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.goals = await upsertMany('goals', payload.goals, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.goal.upsert.bind(prisma.goal) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.problems = await upsertMany('problems', payload.problems, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.problem.upsert.bind(prisma.problem) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  const templateTasks = payload.tasks?.filter((task) => task.isRecurringTemplate === true) ?? [];
  const otherTasks = payload.tasks?.filter((task) => task.isRecurringTemplate !== true) ?? [];

  imported.tasks += await upsertMany('tasks', templateTasks, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.task.upsert.bind(prisma.task) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.taskRecurrences = await upsertMany('taskRecurrences', payload.taskRecurrences, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      prisma.taskRecurrence.upsert.bind(prisma.taskRecurrence) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  }, errors);

  imported.tasks += await upsertMany('tasks', otherTasks, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.task.upsert.bind(prisma.task) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.taskDependencies = await upsertMany('taskDependencies', payload.taskDependencies, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      prisma.taskDependency.upsert.bind(prisma.taskDependency) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  }, errors);

  imported.logs = await upsertMany('logs', payload.logs, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.log.upsert.bind(prisma.log) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.studyTopics = await upsertMany('studyTopics', payload.studyTopics, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      prisma.studyTopic.upsert.bind(prisma.studyTopic) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  }, errors);

  imported.resources = await upsertMany('resources', payload.resources, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.resource.upsert.bind(prisma.resource) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.reminders = await upsertMany('reminders', payload.reminders, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.reminder.upsert.bind(prisma.reminder) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.trackedTags = await upsertMany('trackedTags', payload.trackedTags, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      prisma.trackedTag.upsert.bind(prisma.trackedTag) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  }, errors);

  imported.pendingCaptures = await upsertMany('pendingCaptures', payload.pendingCaptures, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      prisma.pendingCapture.upsert.bind(prisma.pendingCapture) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  }, errors);

  imported.feedGroups = await upsertMany('feedGroups', payload.feedGroups, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.feedGroup.upsert.bind(prisma.feedGroup) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.feedItems = await upsertMany('feedItems', payload.feedItems, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(prisma.feedItem.upsert.bind(prisma.feedItem) as unknown as UpsertFn, { id: idValue }, { id: idValue, ...data }, data);
  }, errors);

  imported.appSettings = await upsertMany('appSettings', payload.appSettings, async (row) => {
    const { idValue, data } = splitRow(row, 'key');
    await runUpsert(
      prisma.appSetting.upsert.bind(prisma.appSetting) as unknown as UpsertFn,
      { key: idValue },
      { key: idValue, ...data },
      data,
    );
  }, errors);

  imported.telegramSubscribers = await upsertMany('telegramSubscribers', payload.telegramSubscribers, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      prisma.telegramSubscriber.upsert.bind(prisma.telegramSubscriber) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  }, errors);

  imported.telegramInboxItems = await upsertMany('telegramInboxItems', payload.telegramInboxItems, async (row) => {
    const { idValue, data } = splitRow(row, 'id');
    await runUpsert(
      prisma.telegramInboxItem.upsert.bind(prisma.telegramInboxItem) as unknown as UpsertFn,
      { id: idValue },
      { id: idValue, ...data },
      data,
    );
  }, errors);

  return { imported, errors };
};
