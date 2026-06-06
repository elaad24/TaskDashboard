import {
  goalBreakdownResponseSchema,
  nextActionResponseSchema,
  overviewBriefingResponseSchema,
  parseResponseSchema,
  solveProblemResponseSchema,
  type GoalBreakdownResponse,
  type NextActionResponse,
  type OverviewBriefingResponse,
  type ParseResponse,
  type SolveProblemResponse,
} from '@command-center/shared';
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getProvider, getProviderByName } from './index.js';
import { getAiHealth, isOpenAiFailureError, markOpenAiFailed } from './health.js';
import {
  NAVIGATOR_SYSTEM,
  GOAL_BREAKDOWN_PROMPT,
  NEXT_ACTION_PROMPT,
  PARSE_PROMPT,
  SOLVE_PROBLEM_PROMPT,
  SUMMARIZE_SEARCH_PROMPT,
  OVERVIEW_BRIEFING_PROMPT,
} from './prompts.js';
import {
  goalBreakdownJsonSchema,
  nextActionJsonSchema,
  overviewBriefingJsonSchema,
  parseResponseJsonSchema,
  solveProblemJsonSchema,
  summarizeSearchJsonSchema,
} from './schemas.js';
import type { SearchHitRow } from '../search/fts.js';

// ---------------------------------------------------------------------------
// Context loaders
// ---------------------------------------------------------------------------

/**
 * Load a compact summary of the user's current state. We pass this into every
 * Navigator call so the model can reason about real goals/areas/topics instead
 * of hallucinating new ones.
 */
const buildBaseContext = async (): Promise<string> => {
  const [areas, activeGoals, openProblems, weakStudy, recentLogs] = await Promise.all([
    prisma.area.findMany({
      include: { tracks: { select: { name: true } } },
      orderBy: { order: 'asc' },
    }),
    prisma.goal.findMany({
      where: { status: 'active' },
      select: { id: true, title: true, progress: true, areaId: true, nextAction: true },
      take: 8,
    }),
    prisma.problem.findMany({
      where: { status: { in: ['open', 'planning'] } },
      select: { id: true, title: true, areaId: true },
      take: 8,
    }),
    prisma.studyTopic.findMany({
      where: { confidence: { not: 'high' } },
      select: { subject: true, topic: true, confidence: true, mockScore: true },
      take: 8,
    }),
    prisma.log.findMany({
      orderBy: { occurredAt: 'desc' },
      select: { title: true, kind: true, costAmount: true, costCurrency: true, occurredAt: true },
      take: 8,
    }),
  ]);

  const areaLines = areas
    .map((a) => `  - ${a.name}${a.tracks.length ? ` [tracks: ${a.tracks.map((t) => t.name).join(', ')}]` : ''}`)
    .join('\n');
  const goalLines = activeGoals
    .map((g) => `  - ${g.title} (progress ${Math.round(g.progress)}%${g.nextAction ? `, next: ${g.nextAction}` : ''})`)
    .join('\n');
  const problemLines = openProblems.map((p) => `  - ${p.title}`).join('\n');
  const studyLines = weakStudy
    .map((s) => `  - ${s.subject} -> ${s.topic} (confidence ${s.confidence}${s.mockScore !== null ? `, mock ${s.mockScore}%` : ''})`)
    .join('\n');
  const logLines = recentLogs
    .map((l) => {
      const cost =
        l.costAmount !== null && l.costAmount !== undefined
          ? ` (${l.costAmount} ${l.costCurrency ?? 'EUR'})`
          : '';
      return `  - [${l.kind}] ${l.title}${cost}`;
    })
    .join('\n');

  return `CONTEXT (user's Command Center, abridged):

Areas:
${areaLines || '  (none yet)'}

Active goals:
${goalLines || '  (none yet)'}

Open problems:
${problemLines || '  (none yet)'}

Weak study topics:
${studyLines || '  (none yet)'}

Recent logs:
${logLines || '  (none yet)'}`;
};

const buildOpenTaskContext = async (limit = 30): Promise<string> => {
  const tasks = await prisma.task.findMany({
    where: { status: { notIn: ['done', 'cancelled'] } },
    orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    include: { area: { select: { name: true } }, goal: { select: { title: true } } },
  });
  if (tasks.length === 0) return 'Open tasks: (none)';
  return [
    'Open tasks (id | title | area | priority | est | goal | dueDate):',
    ...tasks.map(
      (t) =>
        `  - ${t.id} | ${t.title} | ${t.area?.name ?? '-'} | ${t.priority} | ${t.estimatedMinutes ?? '?'}m | ${t.goal?.title ?? '-'} | ${t.dueDate ? t.dueDate.toISOString().slice(0, 10) : '-'}`,
    ),
  ].join('\n');
};

// ---------------------------------------------------------------------------
// Generic OpenAI structured call helper
// ---------------------------------------------------------------------------

const callStructured = async <T>(
  args: {
    system: string;
    user: string;
    jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> };
    parser: (raw: unknown) => T;
    label: string;
  },
): Promise<T> => {
  const health = getAiHealth();

  try {
    const provider = await getProvider();
    return await provider.chatJson(args);
  } catch (err) {
    const canFailover =
      health.preferred === 'openai' &&
      health.effective === 'openai' &&
      (err instanceof HttpError ? err.code === 'AI_REQUEST_FAILED' : isOpenAiFailureError(err));

    if (canFailover) {
      const reason = err instanceof Error ? err.message : 'OpenAI request failed';
      markOpenAiFailed(reason);
      logger.warn({ label: args.label, reason }, 'OpenAI failed — retrying via Ollama fallback');

      try {
        const fallback = await getProviderByName('ollama');
        return await fallback.chatJson(args);
      } catch (fallbackErr) {
        if (fallbackErr instanceof HttpError) throw fallbackErr;
        logger.error({ err: fallbackErr, label: args.label }, 'Ollama fallback also failed');
        throw new HttpError(
          502,
          'AI_REQUEST_FAILED',
          `Navigator failed after Ollama fallback: ${fallbackErr instanceof Error ? fallbackErr.message : 'unknown error'}`,
        );
      }
    }

    if (err instanceof HttpError) throw err;
    logger.error({ err, label: args.label }, 'navigator call failed');
    throw new HttpError(
      502,
      'AI_REQUEST_FAILED',
      `Navigator failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const parseBrainDump = async (text: string, correction?: string): Promise<ParseResponse> => {
  const ctx = await buildBaseContext();
  return callStructured({
    label: 'parseBrainDump',
    system: NAVIGATOR_SYSTEM,
    user: PARSE_PROMPT(text, ctx, correction),
    jsonSchema: parseResponseJsonSchema as never,
    parser: (raw) => parseResponseSchema.parse(raw),
  });
};

export const nextBestAction = async (input: {
  availableMinutes?: number;
  context?: string;
}): Promise<NextActionResponse> => {
  const [base, openTasks] = await Promise.all([buildBaseContext(), buildOpenTaskContext()]);
  const userContext = input.context ? `User-provided context: ${input.context}\n\n` : '';
  return callStructured({
    label: 'nextBestAction',
    system: NAVIGATOR_SYSTEM,
    user: `${userContext}${base}\n\n${openTasks}\n\n${NEXT_ACTION_PROMPT('', input.availableMinutes)}`,
    jsonSchema: nextActionJsonSchema as never,
    parser: (raw) => nextActionResponseSchema.parse(raw),
  });
};

export const breakdownGoal = async (goalId: string): Promise<GoalBreakdownResponse> => {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      area: { select: { name: true } },
      track: { select: { name: true } },
      tasks: { select: { title: true, status: true } },
    },
  });
  if (!goal) throw new HttpError(404, 'GOAL_NOT_FOUND', 'Goal not found');

  const ctx = await buildBaseContext();
  const goalBlock = `GOAL TO BREAK DOWN:
- Title: ${goal.title}
- Area: ${goal.area?.name ?? '-'}
- Track: ${goal.track?.name ?? '-'}
- Progress: ${Math.round(goal.progress)}%
- Description: ${goal.description ?? '(none)'}
- Existing tasks (${goal.tasks.length}): ${goal.tasks.map((t) => `${t.title} [${t.status}]`).join(' | ') || '(none)'}`;

  return callStructured({
    label: 'breakdownGoal',
    system: NAVIGATOR_SYSTEM,
    user: GOAL_BREAKDOWN_PROMPT(ctx, goalBlock),
    jsonSchema: goalBreakdownJsonSchema as never,
    parser: (raw) => goalBreakdownResponseSchema.parse(raw),
  });
};

export const solveProblem = async (problemId: string): Promise<SolveProblemResponse> => {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      area: { select: { name: true } },
      track: { select: { name: true } },
      goal: { select: { title: true } },
    },
  });
  if (!problem) throw new HttpError(404, 'PROBLEM_NOT_FOUND', 'Problem not found');

  const ctx = await buildBaseContext();
  const problemBlock = `PROBLEM:
- Title: ${problem.title}
- Area: ${problem.area?.name ?? '-'}
- Track: ${problem.track?.name ?? '-'}
- Linked goal: ${problem.goal?.title ?? '-'}
- Description: ${problem.description ?? '(none)'}
- Existing AI interpretation: ${problem.aiInterpretation ?? '(none)'}`;

  return callStructured({
    label: 'solveProblem',
    system: NAVIGATOR_SYSTEM,
    user: SOLVE_PROBLEM_PROMPT(ctx, problemBlock),
    jsonSchema: solveProblemJsonSchema as never,
    parser: (raw) => solveProblemResponseSchema.parse(raw),
  });
};

export const summarizeSearch = async (
  query: string,
  hits: Array<SearchHitRow>,
  totals: { count: number; totalCost?: number | null; totalMinutes?: number | null },
): Promise<string> => {
  if (hits.length === 0) return `No results found for "${query}".`;

  const hitsBlock =
    'Top results:\n' +
    hits
      .slice(0, 12)
      .map((h) => {
        const cost =
          h.costAmount !== null
            ? ` (${h.costAmount} ${h.costCurrency ?? 'EUR'})`
            : '';
        const when = h.occurredAt ? ` on ${h.occurredAt.slice(0, 10)}` : '';
        return `  - [${h.type}] ${h.title}${cost}${when}`;
      })
      .join('\n');

  const totalsBlock = `Totals: count=${totals.count}${
    totals.totalCost ? `, total cost=${totals.totalCost.toFixed(2)}` : ''
  }${totals.totalMinutes ? `, total minutes=${totals.totalMinutes}` : ''}.`;

  const result = await callStructured({
    label: 'summarizeSearch',
    system: NAVIGATOR_SYSTEM,
    user: SUMMARIZE_SEARCH_PROMPT(query, hitsBlock, totalsBlock),
    jsonSchema: summarizeSearchJsonSchema as never,
    parser: (raw) => {
      const obj = raw as { summary?: unknown };
      if (typeof obj?.summary !== 'string') throw new HttpError(502, 'AI_BAD_SHAPE', 'Bad summary');
      return obj.summary;
    },
  });
  return result;
};

export const generateOverviewBriefing = async (snapshot: unknown): Promise<OverviewBriefingResponse> => {
  return callStructured({
    label: 'generateOverviewBriefing',
    system: NAVIGATOR_SYSTEM,
    user: OVERVIEW_BRIEFING_PROMPT(JSON.stringify(snapshot)),
    jsonSchema: overviewBriefingJsonSchema as never,
    parser: (raw) => overviewBriefingResponseSchema.parse(raw),
  });
};
