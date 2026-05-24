import type { IngestInput, IngestResponse } from '@command-center/shared';
import { prisma } from '../db.js';
import { createGoal } from './goalService.js';
import { createLog } from './logService.js';
import { createProblem } from './problemService.js';
import { createResource } from './resourceService.js';
import { createStudyTopic } from './studyService.js';
import { createTask } from './taskService.js';

type AreaRow = { id: string; name: string; tracks: Array<{ id: string; name: string }> };

const normalizeName = (value: string): string => value.trim().toLowerCase();

const resolveAreaTrack = (
  areas: Array<AreaRow>,
  areaName: string | undefined,
  trackName: string | undefined,
  areaId: string | null | undefined,
  trackId: string | null | undefined,
): { areaId: string | null | undefined; trackId: string | null | undefined; warning?: string } => {
  let resolvedAreaId = areaId ?? undefined;
  let resolvedTrackId = trackId ?? undefined;

  if (areaName) {
    const match = areas.find((area) => normalizeName(area.name) === normalizeName(areaName));
    if (!match) {
      throw new Error(`Unknown areaName "${areaName}"`);
    }
    resolvedAreaId = match.id;
  }

  if (trackName) {
    const area = areas.find((row) => row.id === resolvedAreaId);
    if (!area) {
      throw new Error(`trackName "${trackName}" requires areaName or areaId`);
    }
    const track = area.tracks.find((row) => normalizeName(row.name) === normalizeName(trackName));
    if (!track) {
      throw new Error(`Unknown trackName "${trackName}" in area "${area.name}"`);
    }
    resolvedTrackId = track.id;
  }

  return { areaId: resolvedAreaId ?? null, trackId: resolvedTrackId ?? null };
};

const stripLinkFields = <T extends Record<string, unknown>>(item: T) => {
  const { areaName: _a, trackName: _t, ...rest } = item;
  return rest;
};

export const buildIngestSpec = async () => {
  const areas = await prisma.area.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true, tracks: { select: { id: true, name: true } } },
  });

  const areaLines = areas.map((area) => {
    const tracks =
      area.tracks.length > 0
        ? area.tracks.map((track) => `    - track: "${track.name}"`).join('\n')
        : '    (no tracks)';
    return `- area: "${area.name}"\n${tracks}`;
  });

  const exampleRequest: IngestInput = {
    tasks: [
      {
        title: 'Review weekly budget',
        priority: 'medium',
        estimatedMinutes: 20,
        areaName: areas[0]?.name ?? 'Personal',
        source: 'manual',
      },
    ],
    logs: [
      {
        title: 'Coffee with team',
        kind: 'expense',
        costAmount: 12.5,
        costCurrency: 'EUR',
        areaName: areas[0]?.name ?? 'Personal',
      },
    ],
  };

  const aiAgentPrompt = `You are preparing JSON for Command Center — a local task/goals dashboard API.

Output ONLY valid JSON (no markdown fences, no commentary) matching this shape:

{
  "tasks": [{ "title": "...", "priority": "low|medium|high|critical", "estimatedMinutes": 30, "dueDate": "2026-05-30T09:00:00.000Z", "areaName": "...", "description": "..." }],
  "goals": [{ "title": "...", "priority": "medium", "targetDate": "2026-12-31T00:00:00.000Z", "areaName": "..." }],
  "problems": [{ "title": "...", "priority": "high", "description": "...", "areaName": "..." }],
  "logs": [{ "title": "...", "kind": "expense|study|note|decision|completion", "costAmount": 10, "costCurrency": "EUR", "timeSpentMinutes": 45, "areaName": "..." }],
  "studyTopics": [{ "subject": "PPL", "topic": "Weather", "confidence": "low|medium|high", "weakTopics": ["METAR"] }],
  "resources": [{ "title": "...", "type": "link|note|file", "url": "https://...", "areaName": "..." }]
}

Rules:
- Include only collections the user asked for; omit empty arrays.
- Use areaName (not areaId) from the list below when linking to an area.
- Optional trackName only when you know the track exists under that area.
- Dates must be ISO-8601 strings.
- task priority: low, medium, high, critical.
- log kind: expense, study, note, decision, completion.
- Keep titles under 200 characters.

Known areas and tracks:
${areaLines.join('\n') || '- (no areas seeded yet — omit areaName or use any name after user creates areas)'}

User request:
[PASTE YOUR REQUEST HERE]`;

  return {
    method: 'POST' as const,
    path: '/api/ingest' as const,
    contentType: 'application/json' as const,
    areas: areas.map((area) => ({ id: area.id, name: area.name })),
    aiAgentPrompt,
    exampleRequest,
    notes: [
      'POST the JSON to http://localhost:4000/api/ingest (or your server URL).',
      'Set header Content-Type: application/json.',
      'Use dryRun: true to validate without saving.',
      'areaName is resolved case-insensitively against your Areas list.',
    ],
  };
};

export const ingestPayload = async (input: IngestInput): Promise<IngestResponse> => {
  const areas = await prisma.area.findMany({
    include: { tracks: true },
    orderBy: { order: 'asc' },
  });

  const response: IngestResponse = {
    dryRun: Boolean(input.dryRun),
    createdTaskIds: [],
    createdGoalIds: [],
    createdProblemIds: [],
    createdLogIds: [],
    createdStudyTopicIds: [],
    createdResourceIds: [],
    warnings: [],
    errors: [],
  };

  const collections: Array<{
    key: keyof IngestInput;
    items: Array<Record<string, unknown>> | undefined;
    create: (payload: Record<string, unknown>) => Promise<{ id: string }>;
    pushId: (id: string) => void;
  }> = [
    {
      key: 'tasks',
      items: input.tasks,
      create: (payload) => createTask(payload as never),
      pushId: (id) => response.createdTaskIds.push(id),
    },
    {
      key: 'goals',
      items: input.goals,
      create: (payload) => createGoal(payload as never),
      pushId: (id) => response.createdGoalIds.push(id),
    },
    {
      key: 'problems',
      items: input.problems,
      create: (payload) => createProblem(payload as never),
      pushId: (id) => response.createdProblemIds.push(id),
    },
    {
      key: 'logs',
      items: input.logs,
      create: (payload) => createLog(payload as never),
      pushId: (id) => response.createdLogIds.push(id),
    },
    {
      key: 'studyTopics',
      items: input.studyTopics,
      create: (payload) => createStudyTopic(payload as never),
      pushId: (id) => response.createdStudyTopicIds.push(id),
    },
    {
      key: 'resources',
      items: input.resources,
      create: (payload) => createResource(payload as never),
      pushId: (id) => response.createdResourceIds.push(id),
    },
  ];

  for (const collection of collections) {
    if (!collection.items?.length) continue;

    for (let index = 0; index < collection.items.length; index += 1) {
      const raw = collection.items[index]!;
      try {
        const { areaName, trackName, areaId, trackId, ...rest } = raw as {
          areaName?: string;
          trackName?: string;
          areaId?: string | null;
          trackId?: string | null;
        };
        const resolved = resolveAreaTrack(areas, areaName, trackName, areaId, trackId);
        const payload: Record<string, unknown> = {
          ...stripLinkFields(rest),
          areaId: resolved.areaId,
          trackId: resolved.trackId,
        };

        if (input.dryRun) {
          const label =
            typeof payload.title === 'string'
              ? payload.title
              : typeof payload.subject === 'string'
                ? payload.subject
                : 'item';
          response.warnings.push(`Validated ${String(collection.key)}[${index}]: ${label}`);
          continue;
        }

        const created = await collection.create(payload);
        collection.pushId(created.id);
      } catch (err) {
        response.errors.push({
          collection: String(collection.key),
          index,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  return response;
};
