import type {
  Area as PArea,
  Track as PTrack,
  Goal as PGoal,
  Task as PTask,
  Problem as PProblem,
  Log as PLog,
  StudyTopic as PStudyTopic,
  Resource as PResource,
  TaskRecurrence as PTaskRecurrence,
  Reminder as PReminder,
} from '@prisma/client';
import type {
  Area,
  DashboardLog,
  Goal,
  Log,
  Problem,
  Resource,
  StudyTopic,
  Task,
  Track,
  TaskRecurrence,
  Reminder,
} from '@command-center/shared';

const iso = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null;

const isoRequired = (d: Date): string => d.toISOString();

export const serializeArea = (a: PArea): Area => ({
  id: a.id,
  name: a.name,
  description: a.description,
  color: a.color,
  icon: a.icon,
  status: a.status as Area['status'],
  order: a.order,
  createdAt: isoRequired(a.createdAt),
  updatedAt: isoRequired(a.updatedAt),
});

export const serializeTrack = (t: PTrack): Track => ({
  id: t.id,
  areaId: t.areaId,
  name: t.name,
  description: t.description,
  createdAt: isoRequired(t.createdAt),
  updatedAt: isoRequired(t.updatedAt),
});

export const serializeGoal = (g: PGoal): Goal => ({
  id: g.id,
  title: g.title,
  description: g.description,
  areaId: g.areaId,
  trackId: g.trackId,
  status: g.status as Goal['status'],
  priority: g.priority as Goal['priority'],
  sortOrder: g.sortOrder,
  progress: g.progress,
  targetDate: iso(g.targetDate),
  nextAction: g.nextAction,
  notes: g.notes,
  createdAt: isoRequired(g.createdAt),
  updatedAt: isoRequired(g.updatedAt),
  completedAt: iso(g.completedAt),
});

export const serializeTask = (t: PTask): Task => ({
  id: t.id,
  title: t.title,
  description: t.description,
  status: t.status as Task['status'],
  priority: t.priority as Task['priority'],
  sortOrder: t.sortOrder,
  priorityScore: t.priorityScore,
  importance: t.importance,
  urgency: t.urgency,
  effort: t.effort,
  areaId: t.areaId,
  trackId: t.trackId,
  goalId: t.goalId,
  problemId: t.problemId,
  dueDate: iso(t.dueDate),
  estimatedMinutes: t.estimatedMinutes,
  actualMinutes: t.actualMinutes,
  costAmount: t.costAmount,
  costCurrency: t.costCurrency,
  source: t.source as Task['source'],
  reason: t.reason,
  recurrenceId: t.recurrenceId,
  isRecurringTemplate: t.isRecurringTemplate,
  createdAt: isoRequired(t.createdAt),
  updatedAt: isoRequired(t.updatedAt),
  completedAt: iso(t.completedAt),
});

export const serializeProblem = (p: PProblem): Problem => ({
  id: p.id,
  title: p.title,
  description: p.description,
  areaId: p.areaId,
  trackId: p.trackId,
  goalId: p.goalId,
  status: p.status as Problem['status'],
  priority: p.priority as Problem['priority'],
  aiInterpretation: p.aiInterpretation,
  suggestedPlan: p.suggestedPlan,
  createdAt: isoRequired(p.createdAt),
  updatedAt: isoRequired(p.updatedAt),
  resolvedAt: iso(p.resolvedAt),
});

export const serializeLog = (l: PLog): Log => ({
  id: l.id,
  title: l.title,
  content: l.content,
  kind: l.kind as Log['kind'],
  areaId: l.areaId,
  trackId: l.trackId,
  goalId: l.goalId,
  taskId: l.taskId,
  problemId: l.problemId,
  studyTopicId: l.studyTopicId,
  timeSpentMinutes: l.timeSpentMinutes,
  costAmount: l.costAmount,
  costCurrency: l.costCurrency,
  occurredAt: isoRequired(l.occurredAt),
  createdAt: isoRequired(l.createdAt),
});

type LogWithRelations = PLog & {
  task?: PTask | null;
  area?: { name: string } | null;
};

export const serializeDashboardLog = (l: LogWithRelations): DashboardLog => ({
  ...serializeLog(l),
  taskTitle: l.task?.title ?? null,
  task: l.task ? serializeTask(l.task) : null,
  areaName: l.area?.name ?? null,
});

export const serializeStudyTopic = (s: PStudyTopic): StudyTopic => {
  let weakTopics: Array<string> = [];
  try {
    const parsed = JSON.parse(s.weakTopics);
    if (Array.isArray(parsed)) weakTopics = parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    weakTopics = [];
  }
  return {
    id: s.id,
    subject: s.subject,
    topic: s.topic,
    confidence: s.confidence as StudyTopic['confidence'],
    mockScore: s.mockScore,
    weakTopics,
    totalMinutes: s.totalMinutes,
    areaId: s.areaId,
    trackId: s.trackId,
    goalId: s.goalId,
    notes: s.notes,
    lastStudiedAt: iso(s.lastStudiedAt),
    nextReviewAt: iso(s.nextReviewAt),
    createdAt: isoRequired(s.createdAt),
    updatedAt: isoRequired(s.updatedAt),
  };
};

export const serializeResource = (r: PResource): Resource => ({
  id: r.id,
  title: r.title,
  url: r.url,
  type: r.type as Resource['type'],
  content: r.content,
  areaId: r.areaId,
  trackId: r.trackId,
  goalId: r.goalId,
  studyTopicId: r.studyTopicId,
  createdAt: isoRequired(r.createdAt),
  updatedAt: isoRequired(r.updatedAt),
});

const parseWeekdays = (value: string | null): Array<number> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is number => typeof item === 'number');
    }
  } catch {
    // ignore malformed value
  }
  return null;
};

export const serializeTaskRecurrence = (r: PTaskRecurrence): TaskRecurrence => ({
  id: r.id,
  taskId: r.taskId,
  frequency: r.frequency as TaskRecurrence['frequency'],
  intervalDays: r.intervalDays,
  weekdays: parseWeekdays(r.weekdays),
  monthDay: r.monthDay,
  timeOfDay: r.timeOfDay,
  timezone: r.timezone,
  startsOn: isoRequired(r.startsOn),
  endsOn: iso(r.endsOn),
  lastMaterializedAt: iso(r.lastMaterializedAt),
  isActive: r.isActive,
  autoCreateCalendarEvent: r.autoCreateCalendarEvent,
  createdAt: isoRequired(r.createdAt),
  updatedAt: isoRequired(r.updatedAt),
});

export const serializeReminder = (r: PReminder): Reminder => ({
  id: r.id,
  kind: r.kind as Reminder['kind'],
  targetType: (r.targetType as Reminder['targetType']) ?? null,
  targetId: r.targetId,
  taskId: r.taskId,
  title: r.title,
  body: r.body,
  scheduledFor: isoRequired(r.scheduledFor),
  timezone: r.timezone,
  status: r.status as Reminder['status'],
  sentAt: iso(r.sentAt),
  snoozedUntil: iso(r.snoozedUntil),
  attempt: r.attempt,
  lastError: r.lastError,
  createdAt: isoRequired(r.createdAt),
  updatedAt: isoRequired(r.updatedAt),
});
