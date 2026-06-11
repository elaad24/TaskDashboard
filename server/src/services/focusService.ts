import { z } from 'zod';
import type {
  CreateFocusSessionInput,
  DistractionCategory,
  FocusActivityType,
  FocusInsight,
  FocusRange,
  FocusSession,
  FocusStats,
  FocusSuggestInput,
  FocusSuggestResponse,
} from '@command-center/shared';
import {
  DISTRACTION_CATEGORY_LABELS,
  FOCUS_ACTIVITY_LABELS,
  distractionCategorySchema,
  focusSuggestResponseSchema,
  isLearningActivityType,
} from '@command-center/shared';
import { getProvider } from '../ai/index.js';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { logger } from '../logger.js';
import { createStudyTopic, getStudyTopic, updateStudyTopic } from './studyService.js';
import { serializeFocusInsight, serializeFocusSession } from '../utils/serialize.js';
import {
  isSameLocalCalendarDay,
  startOfLocalDay,
  startOfWeek,
} from '../utils/dates.js';

const categorizeResponseSchema = z.object({
  category: distractionCategorySchema,
});

const CATEGORIZE_JSON_SCHEMA = {
  name: 'focus_stop_reason_classification',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      category: {
        type: 'string',
        enum: [
          'phone_social',
          'physical_need',
          'interruption',
          'boredom_fatigue',
          'task_switch',
          'planned_break',
          'other',
        ],
      },
    },
    required: ['category'],
  },
};

const CATEGORIZE_SYSTEM = `You classify why someone stopped a focus session.
Respond with JSON only.

Categories (pick exactly one):
- phone_social: checked phone, social media, Instagram, TikTok, messages, notifications
- physical_need: restroom, hunger, thirst, tired body, stretch, walk
- interruption: someone talked to me, doorbell, call, external noise, unexpected event
- boredom_fatigue: lost interest, mental fatigue, couldn't concentrate, brain fog
- task_switch: switched to another task or activity intentionally
- planned_break: intentional scheduled break, timer ended, planned rest
- other: none of the above

Pick the single best match. Prefer specific categories over "other".`;

const SUGGEST_JSON_SCHEMA = {
  name: 'focus_link_suggestions',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      isLearning: { type: 'boolean' },
      candidateTopicIds: {
        type: 'array',
        items: { type: 'string' },
      },
      candidateTaskIds: {
        type: 'array',
        items: { type: 'string' },
      },
      candidateGoalIds: {
        type: 'array',
        items: { type: 'string' },
      },
      topicReasons: {
        type: 'array',
        items: { type: 'string' },
      },
      proposedSubject: { type: ['string', 'null'] },
      proposedTopic: { type: ['string', 'null'] },
      proposedAreaId: { type: ['string', 'null'] },
    },
    required: [
      'isLearning',
      'candidateTopicIds',
      'candidateTaskIds',
      'candidateGoalIds',
      'topicReasons',
      'proposedSubject',
      'proposedTopic',
      'proposedAreaId',
    ],
  },
};

const suggestAiResponseSchema = z.object({
  isLearning: z.boolean(),
  candidateTopicIds: z.array(z.string()),
  candidateTaskIds: z.array(z.string()),
  candidateGoalIds: z.array(z.string()),
  topicReasons: z.array(z.string()),
  proposedSubject: z.string().nullable(),
  proposedTopic: z.string().nullable(),
  proposedAreaId: z.string().nullable(),
});

const SUGGEST_SYSTEM = `You match a focus session description to existing study topics, open tasks, and active goals.
Respond with JSON only.

Rules:
- isLearning: true if the user was studying, reading, working on a skill, or doing creative learning work
- candidateTopicIds: up to 3 IDs from the provided study topics list that best match (empty if none)
- candidateTaskIds: up to 3 IDs from open tasks that best match (empty if none)
- candidateGoalIds: up to 3 IDs from active goals that best match (empty if none)
- topicReasons: one short reason per candidate topic, same order as candidateTopicIds
- proposedSubject + proposedTopic: if nothing matches well, suggest a new study topic subject and topic name; otherwise null
- proposedAreaId: optional area id if obvious from context; otherwise null
- Only use IDs that appear in the provided lists`;

const INSIGHT_JSON_SCHEMA = {
  name: 'focus_insight',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      topDistractions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            category: {
              type: 'string',
              enum: [
                'phone_social',
                'physical_need',
                'interruption',
                'boredom_fatigue',
                'task_switch',
                'planned_break',
                'other',
              ],
            },
            count: { type: 'number' },
            label: { type: 'string' },
          },
          required: ['category', 'count', 'label'],
        },
      },
      advice: { type: 'string' },
    },
    required: ['topDistractions', 'advice'],
  },
};

const insightResponseSchema = z.object({
  topDistractions: z.array(
    z.object({
      category: distractionCategorySchema,
      count: z.number().int().min(0),
      label: z.string().min(1).max(200),
    }),
  ),
  advice: z.string().min(1).max(2000),
});

const tokenize = (text: string): Array<string> =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

const scoreOverlap = (text: string, query: string): number => {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return 0;
  const textTokens = tokenize(text);
  let hits = 0;
  for (const token of textTokens) {
    if (queryTokens.has(token)) hits += 1;
  }
  return hits;
};

const categorizeWithHeuristic = (reason: string): DistractionCategory => {
  const text = reason.toLowerCase();

  if (
    /instagram|tiktok|twitter|facebook|snapchat|reddit|phone|scroll|notification|message|whatsapp|telegram|social|youtube|video/.test(
      text,
    )
  ) {
    return 'phone_social';
  }
  if (/restroom|bathroom|toilet|hungry|eat|thirst|drink|water|sleep|tired body|stretch|walk/.test(text)) {
    return 'physical_need';
  }
  if (/interrupted|someone|doorbell|call|noise|knock|talked|disturb/.test(text)) {
    return 'interruption';
  }
  if (/bored|fatigue|fog|can't focus|cannot focus|lost interest|drained|exhausted mentally/.test(text)) {
    return 'boredom_fatigue';
  }
  if (/switch|another task|different task|changed activity|moved on/.test(text)) {
    return 'task_switch';
  }
  if (/break|rest|planned|timer ended|scheduled/.test(text)) {
    return 'planned_break';
  }

  return 'other';
};

const categorizeReason = async (
  reason: string,
  activityType: FocusActivityType,
  activityNote?: string,
): Promise<DistractionCategory> => {
  try {
    const provider = await getProvider();
    const result = await provider.chatJson({
      system: CATEGORIZE_SYSTEM,
      user: [
        `Activity: ${activityType}`,
        activityNote ? `Note: ${activityNote}` : null,
        `Stop reason: ${reason}`,
      ]
        .filter(Boolean)
        .join('\n'),
      jsonSchema: CATEGORIZE_JSON_SCHEMA,
      parser: (raw) => {
        const parsed = categorizeResponseSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error('Invalid categorization payload');
        }
        return parsed.data;
      },
      label: 'focus_categorize',
    });
    return result.category;
  } catch (err) {
    logger.warn({ err }, 'focus AI categorization failed; using heuristic fallback');
    return categorizeWithHeuristic(reason);
  }
};

type LinkContext = {
  topics: Array<{ id: string; subject: string; topic: string; areaId: string | null }>;
  tasks: Array<{ id: string; title: string; areaId: string | null; goalId: string | null }>;
  goals: Array<{ id: string; title: string; areaId: string | null }>;
  areas: Array<{ id: string; name: string }>;
};

const loadLinkContext = async (): Promise<LinkContext> => {
  const [topics, tasks, goals, areas] = await Promise.all([
    prisma.studyTopic.findMany({
      select: { id: true, subject: true, topic: true, areaId: true },
      orderBy: [{ lastStudiedAt: 'desc' }, { subject: 'asc' }],
      take: 40,
    }),
    prisma.task.findMany({
      where: { status: { notIn: ['done', 'cancelled'] } },
      select: { id: true, title: true, areaId: true, goalId: true },
      orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    }),
    prisma.goal.findMany({
      where: { status: 'active' },
      select: { id: true, title: true, areaId: true },
      orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }],
      take: 20,
    }),
    prisma.area.findMany({
      select: { id: true, name: true },
      orderBy: { order: 'asc' },
    }),
  ]);
  return { topics, tasks, goals, areas };
};

const buildSuggestContextText = (ctx: LinkContext): string => {
  const topicLines = ctx.topics.map((t) => `  - id:${t.id} | ${t.subject} -> ${t.topic}`).join('\n');
  const taskLines = ctx.tasks.map((t) => `  - id:${t.id} | ${t.title}`).join('\n');
  const goalLines = ctx.goals.map((g) => `  - id:${g.id} | ${g.title}`).join('\n');
  const areaLines = ctx.areas.map((a) => `  - id:${a.id} | ${a.name}`).join('\n');

  return `Study topics:
${topicLines || '  (none)'}

Open tasks:
${taskLines || '  (none)'}

Active goals:
${goalLines || '  (none)'}

Areas:
${areaLines || '  (none)'}`;
};

const suggestWithHeuristic = (
  input: FocusSuggestInput,
  ctx: LinkContext,
): FocusSuggestResponse => {
  const isLearning = isLearningActivityType(input.activityType);
  const query = input.description;

  const rankedTopics = ctx.topics
    .map((t) => ({
      topic: t,
      score: scoreOverlap(`${t.subject} ${t.topic}`, query),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const rankedTasks = ctx.tasks
    .map((t) => ({ task: t, score: scoreOverlap(t.title, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const rankedGoals = ctx.goals
    .map((g) => ({ goal: g, score: scoreOverlap(g.title, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const words = input.description.trim().split(/\s+/).slice(0, 6).join(' ');
  const proposedTopic =
    rankedTopics.length === 0
      ? {
          subject: FOCUS_ACTIVITY_LABELS[input.activityType],
          topic: words || 'General session',
          areaId: null,
        }
      : null;

  return focusSuggestResponseSchema.parse({
    isLearning,
    candidateTopics: rankedTopics.map((r) => ({
      id: r.topic.id,
      subject: r.topic.subject,
      topic: r.topic.topic,
      reason: `Matches keywords in your description`,
    })),
    candidateTasks: rankedTasks.map((r) => ({
      id: r.task.id,
      title: r.task.title,
    })),
    candidateGoals: rankedGoals.map((r) => ({
      id: r.goal.id,
      title: r.goal.title,
    })),
    proposedTopic,
  });
};

export const suggestFocusLinks = async (
  input: FocusSuggestInput,
): Promise<FocusSuggestResponse> => {
  const ctx = await loadLinkContext();
  const isLearning = isLearningActivityType(input.activityType);

  if (!isLearning) {
    return focusSuggestResponseSchema.parse({
      isLearning: false,
      candidateTopics: [],
      candidateTasks: [],
      candidateGoals: [],
      proposedTopic: null,
    });
  }

  try {
    const provider = await getProvider();
    const aiResult = await provider.chatJson({
      system: SUGGEST_SYSTEM,
      user: [
        `Activity type: ${input.activityType}`,
        `Description: ${input.description}`,
        '',
        buildSuggestContextText(ctx),
      ].join('\n'),
      jsonSchema: SUGGEST_JSON_SCHEMA,
      parser: (raw) => {
        const parsed = suggestAiResponseSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error('Invalid suggest payload');
        }
        return parsed.data;
      },
      label: 'focus_suggest',
    });

    const topicMap = new Map(ctx.topics.map((t) => [t.id, t]));
    const taskMap = new Map(ctx.tasks.map((t) => [t.id, t]));
    const goalMap = new Map(ctx.goals.map((g) => [g.id, g]));

    const candidateTopics = aiResult.candidateTopicIds
      .map((id, index) => {
        const topic = topicMap.get(id);
        if (!topic) return null;
        return {
          id: topic.id,
          subject: topic.subject,
          topic: topic.topic,
          reason: aiResult.topicReasons[index] ?? 'Closest match to your description',
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .slice(0, 3);

    const candidateTasks = aiResult.candidateTaskIds
      .map((id) => taskMap.get(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
      .map((t) => ({ id: t.id, title: t.title }))
      .slice(0, 3);

    const candidateGoals = aiResult.candidateGoalIds
      .map((id) => goalMap.get(id))
      .filter((g): g is NonNullable<typeof g> => g !== undefined)
      .map((g) => ({ id: g.id, title: g.title }))
      .slice(0, 3);

    const proposedTopic =
      aiResult.proposedSubject && aiResult.proposedTopic
        ? {
            subject: aiResult.proposedSubject,
            topic: aiResult.proposedTopic,
            areaId: aiResult.proposedAreaId,
          }
        : candidateTopics.length === 0
          ? {
              subject: FOCUS_ACTIVITY_LABELS[input.activityType],
              topic: input.description.trim().slice(0, 200),
              areaId: null,
            }
          : null;

    return focusSuggestResponseSchema.parse({
      isLearning: aiResult.isLearning,
      candidateTopics,
      candidateTasks,
      candidateGoals,
      proposedTopic,
    });
  } catch (err) {
    logger.warn({ err }, 'focus AI suggest failed; using heuristic fallback');
    return suggestWithHeuristic(input, ctx);
  }
};

type ResolvedLinks = {
  studyTopicId: string | null;
  taskId: string | null;
  goalId: string | null;
  areaId: string | null;
  logTitle: string;
};

const resolveLinks = async (
  input: CreateFocusSessionInput,
  isLearning: boolean,
  description: string,
): Promise<ResolvedLinks> => {
  const linkMode = input.linkMode ?? 'none';
  const fallbackTitle = description.slice(0, 200) || FOCUS_ACTIVITY_LABELS[input.activityType];

  if (!isLearning || linkMode === 'none') {
    return {
      studyTopicId: null,
      taskId: null,
      goalId: null,
      areaId: input.areaId ?? null,
      logTitle: fallbackTitle,
    };
  }

  switch (linkMode) {
    case 'existing_topic': {
      if (!input.studyTopicId) {
        throw new HttpError(400, 'STUDY_TOPIC_REQUIRED', 'studyTopicId is required for existing_topic');
      }
      const topic = await getStudyTopic(input.studyTopicId);
      return {
        studyTopicId: topic.id,
        taskId: null,
        goalId: topic.goalId,
        areaId: topic.areaId ?? input.areaId ?? null,
        logTitle: `${topic.subject} — ${topic.topic}`,
      };
    }
    case 'task': {
      if (!input.taskId) {
        throw new HttpError(400, 'TASK_REQUIRED', 'taskId is required for task link');
      }
      const task = await prisma.task.findUnique({ where: { id: input.taskId } });
      if (!task) {
        throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
      }
      return {
        studyTopicId: null,
        taskId: task.id,
        goalId: task.goalId,
        areaId: task.areaId ?? input.areaId ?? null,
        logTitle: task.title,
      };
    }
    case 'goal': {
      if (!input.goalId) {
        throw new HttpError(400, 'GOAL_REQUIRED', 'goalId is required for goal link');
      }
      const goal = await prisma.goal.findUnique({ where: { id: input.goalId } });
      if (!goal) {
        throw new HttpError(404, 'GOAL_NOT_FOUND', 'Goal not found');
      }
      return {
        studyTopicId: null,
        taskId: null,
        goalId: goal.id,
        areaId: goal.areaId ?? input.areaId ?? null,
        logTitle: goal.title,
      };
    }
    case 'new_topic': {
      if (!input.newTopic?.subject || !input.newTopic?.topic) {
        throw new HttpError(400, 'NEW_TOPIC_REQUIRED', 'newTopic subject and topic are required');
      }
      const created = await createStudyTopic({
        subject: input.newTopic.subject.trim(),
        topic: input.newTopic.topic.trim(),
        areaId: input.newTopic.areaId ?? input.areaId ?? null,
        totalMinutes: 0,
      });
      return {
        studyTopicId: created.id,
        taskId: null,
        goalId: created.goalId,
        areaId: created.areaId ?? input.areaId ?? null,
        logTitle: `${created.subject} — ${created.topic}`,
      };
    }
    default:
      return {
        studyTopicId: null,
        taskId: null,
        goalId: null,
        areaId: input.areaId ?? null,
        logTitle: fallbackTitle,
      };
  }
};

const rangeToStart = (range: FocusRange): Date | null => {
  const now = new Date();

  switch (range) {
    case 'today':
      return startOfLocalDay(now);
    case 'week':
      return startOfWeek(now);
    case 'month': {
      const start = startOfLocalDay(now);
      start.setDate(1);
      return start;
    }
    case 'year': {
      const start = startOfLocalDay(now);
      start.setMonth(0, 1);
      return start;
    }
    case 'all':
    default:
      return null;
  }
};

const isSameCalendarDay = isSameLocalCalendarDay;

const buildStats = (
  sessions: Array<{ activityType: string; distractionCategory: string; durationSeconds: number }>,
  range: FocusRange,
): FocusStats => {
  const totalSessions = sessions.length;
  const totalDurationSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const avgDurationSeconds = totalSessions > 0 ? totalDurationSeconds / totalSessions : 0;

  const distractionMap = new Map<
    DistractionCategory,
    { count: number; totalDurationSeconds: number }
  >();
  const activityMap = new Map<FocusActivityType, { count: number; totalDurationSeconds: number }>();

  for (const session of sessions) {
    const cat = session.distractionCategory as DistractionCategory;
    const act = session.activityType as FocusActivityType;
    const d = distractionMap.get(cat) ?? { count: 0, totalDurationSeconds: 0 };
    d.count += 1;
    d.totalDurationSeconds += session.durationSeconds;
    distractionMap.set(cat, d);

    const a = activityMap.get(act) ?? { count: 0, totalDurationSeconds: 0 };
    a.count += 1;
    a.totalDurationSeconds += session.durationSeconds;
    activityMap.set(act, a);
  }

  const byDistraction = Array.from(distractionMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      totalDurationSeconds: data.totalDurationSeconds,
      avgDurationSeconds: data.count > 0 ? data.totalDurationSeconds / data.count : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const byActivity = Array.from(activityMap.entries())
    .map(([activityType, data]) => ({
      activityType,
      count: data.count,
      totalDurationSeconds: data.totalDurationSeconds,
      avgDurationSeconds: data.count > 0 ? data.totalDurationSeconds / data.count : 0,
    }))
    .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);

  return {
    range,
    totalSessions,
    totalDurationSeconds,
    avgDurationSeconds,
    byDistraction,
    byActivity,
    topDistractions: byDistraction.slice(0, 3),
  };
};

export const listFocusSessions = async (
  range: FocusRange = 'all',
  options?: { limit?: number; offset?: number },
): Promise<Array<FocusSession>> => {
  const start = rangeToStart(range);
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 1000);
  const offset = Math.max(options?.offset ?? 0, 0);
  const sessions = await prisma.focusSession.findMany({
    where: start ? { startedAt: { gte: start } } : undefined,
    orderBy: { startedAt: 'desc' },
    take: limit,
    skip: offset,
  });
  return sessions.map(serializeFocusSession);
};

export const createFocusSession = async (input: CreateFocusSessionInput): Promise<FocusSession> => {
  const isLearning = isLearningActivityType(input.activityType);
  const description =
    input.description?.trim() || input.activityNote?.trim() || FOCUS_ACTIVITY_LABELS[input.activityType];

  const startedAt = new Date(input.startedAt);
  const endedAt = new Date(input.endedAt);
  const computedDurationSeconds = Math.max(
    1,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
  );
  if (Math.abs(computedDurationSeconds - input.durationSeconds) > 2) {
    throw new HttpError(
      400,
      'DURATION_MISMATCH',
      'durationSeconds does not match startedAt and endedAt',
    );
  }
  const durationSeconds = computedDurationSeconds;
  const timeSpentMinutes = Math.round(durationSeconds / 60);

  const [distractionCategory, resolved] = await Promise.all([
    categorizeReason(input.stopReason, input.activityType, input.activityNote),
    resolveLinks(input, isLearning, description),
  ]);

  const session = await prisma.$transaction(async (tx) => {
    const log = await tx.log.create({
      data: {
        title: resolved.logTitle.slice(0, 200),
        content: description,
        kind: isLearning ? 'study' : 'note',
        areaId: resolved.areaId,
        goalId: resolved.goalId,
        taskId: resolved.taskId,
        studyTopicId: resolved.studyTopicId,
        timeSpentMinutes: timeSpentMinutes > 0 ? timeSpentMinutes : null,
        occurredAt: startedAt,
      },
    });

    if (resolved.studyTopicId) {
      const topic = await tx.studyTopic.findUnique({ where: { id: resolved.studyTopicId } });
      if (topic) {
        await tx.studyTopic.update({
          where: { id: resolved.studyTopicId },
          data: {
            totalMinutes: topic.totalMinutes + timeSpentMinutes,
            lastStudiedAt: endedAt,
          },
        });
      }
    }

    return tx.focusSession.create({
      data: {
        activityType: input.activityType,
        activityNote: input.activityNote?.trim() || null,
        description,
        isLearning,
        startedAt,
        endedAt,
        durationSeconds,
        stopReason: input.stopReason.trim(),
        distractionCategory,
        logId: log.id,
        studyTopicId: resolved.studyTopicId,
        taskId: resolved.taskId,
        goalId: resolved.goalId,
        areaId: resolved.areaId,
      },
    });
  });

  return serializeFocusSession(session);
};

export const getFocusStats = async (range: FocusRange = 'week'): Promise<FocusStats> => {
  const start = rangeToStart(range);
  const sessions = await prisma.focusSession.findMany({
    where: start ? { startedAt: { gte: start } } : undefined,
    select: {
      activityType: true,
      distractionCategory: true,
      durationSeconds: true,
    },
  });
  return buildStats(sessions, range);
};

const generateInsightFromSessions = async (
  sessions: Array<{
    activityType: string;
    activityNote: string | null;
    durationSeconds: number;
    stopReason: string;
    distractionCategory: string;
    startedAt: Date;
  }>,
  stats: FocusStats,
): Promise<{ topDistractions: FocusInsight['topDistractions']; advice: string }> => {
  if (sessions.length === 0) {
    return {
      topDistractions: [],
      advice:
        'Start tracking a few focus sessions first. Once you have data, insights will highlight your top distractions and practical ways to stay focused longer.',
    };
  }

  const summary = sessions
    .slice(0, 30)
    .map(
      (s, i) =>
        `${i + 1}. ${s.activityType}${s.activityNote ? ` (${s.activityNote})` : ''} — ${Math.round(s.durationSeconds / 60)}min — stopped: "${s.stopReason}" [${s.distractionCategory}]`,
    )
    .join('\n');

  const INSIGHT_SYSTEM = `You are an ADHD-aware productivity coach analyzing focus session data.
Respond with JSON only.

Rules:
- topDistractions: up to 3 items from the provided stats, with human-readable labels
- advice: 2-4 short, actionable paragraphs helping reduce distractions and extend focus
- Be empathetic, practical, and specific to the patterns shown
- Do not shame the user; focus on systems and environment changes`;

  try {
    const provider = await getProvider();
    const result = await provider.chatJson({
      system: INSIGHT_SYSTEM,
      user: [
        `Stats summary:`,
        `- Total sessions: ${stats.totalSessions}`,
        `- Avg focus duration: ${Math.round(stats.avgDurationSeconds / 60)} minutes`,
        `- Top distractions: ${stats.topDistractions.map((d) => `${DISTRACTION_CATEGORY_LABELS[d.category]} (${d.count}x)`).join(', ') || 'none yet'}`,
        '',
        'Recent sessions:',
        summary,
      ].join('\n'),
      jsonSchema: INSIGHT_JSON_SCHEMA,
      parser: (raw) => {
        const parsed = insightResponseSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error('Invalid insight payload');
        }
        return parsed.data;
      },
      label: 'focus_insight',
    });

    return {
      topDistractions: result.topDistractions.slice(0, 3),
      advice: result.advice,
    };
  } catch (err) {
    logger.warn({ err }, 'focus AI insight failed; using fallback');
    return {
      topDistractions: stats.topDistractions.map((d) => ({
        category: d.category,
        count: d.count,
        label: DISTRACTION_CATEGORY_LABELS[d.category],
      })),
      advice: [
        `Your average focus block is about ${Math.round(stats.avgDurationSeconds / 60)} minutes.`,
        stats.topDistractions.length > 0
          ? `Your top interruption is ${DISTRACTION_CATEGORY_LABELS[stats.topDistractions[0]!.category]} (${stats.topDistractions[0]!.count} times). Try removing that trigger before starting: put your phone in another room, use a website blocker, or set a visible timer.`
          : 'Keep logging sessions to spot patterns.',
        'Start with shorter focus blocks (15–25 min) and take planned breaks so stops feel intentional rather than frustrating.',
      ].join('\n\n'),
    };
  }
};

const getLatestInsightRecord = async () =>
  prisma.focusInsight.findFirst({
    orderBy: { generatedAt: 'desc' },
  });

export const getLatestFocusInsight = async (): Promise<FocusInsight | null> => {
  const latest = await getLatestInsightRecord();
  return latest ? serializeFocusInsight(latest) : null;
};

export const getOrGenerateFocusInsight = async (options?: {
  force?: boolean;
}): Promise<FocusInsight> => {
  const latest = await getLatestInsightRecord();
  const now = new Date();

  if (!options?.force && latest && isSameCalendarDay(latest.generatedAt, now)) {
    return serializeFocusInsight(latest);
  }

  if (options?.force && latest && isSameCalendarDay(latest.generatedAt, now)) {
    await prisma.focusInsight.delete({ where: { id: latest.id } });
  }

  const lastGeneratedAt = latest?.generatedAt ?? new Date(0);
  const newSessions = await prisma.focusSession.findMany({
    where: { createdAt: { gt: lastGeneratedAt } },
    orderBy: { startedAt: 'desc' },
    take: 100,
  });

  const allSessions = await prisma.focusSession.findMany({
    orderBy: { startedAt: 'desc' },
    take: 100,
    select: {
      activityType: true,
      activityNote: true,
      durationSeconds: true,
      stopReason: true,
      distractionCategory: true,
      startedAt: true,
    },
  });

  const stats = buildStats(allSessions, 'month');
  const { topDistractions, advice } = await generateInsightFromSessions(allSessions, stats);

  const insight = await prisma.focusInsight.create({
    data: {
      generatedAt: now,
      sessionsAnalyzed: newSessions.length > 0 ? newSessions.length : allSessions.length,
      topDistractions: JSON.stringify(topDistractions),
      advice,
      stats: JSON.stringify(stats),
    },
  });

  return serializeFocusInsight(insight);
};
