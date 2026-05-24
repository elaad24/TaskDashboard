/**
 * JSON Schemas for OpenAI structured outputs.
 *
 * Why hand-written instead of zod-to-json-schema?
 * - OpenAI's `json_schema` mode in `response_format` requires every property
 *   to be listed under `required`, no `default` keywords, and `additionalProperties: false`.
 *   Auto-converted Zod schemas often violate one of these constraints.
 * - We Zod-validate the raw response anyway in navigator.ts, so the JSON schema
 *   is just a guidance hint for the model.
 */

export const parseResponseJsonSchema = {
  name: 'parse_response',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      navigatorMessage: { type: ['string', 'null'] },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: {
              type: 'string',
              enum: [
                'task',
                'goal',
                'problem',
                'expense',
                'note',
                'study_weakness',
                'resource',
                'decision',
              ],
            },
            title: { type: 'string' },
            summary: { type: ['string', 'null'] },
            area: { type: ['string', 'null'] },
            track: { type: ['string', 'null'] },
            priority: {
              type: ['string', 'null'],
              enum: ['low', 'medium', 'high', 'critical', null],
            },
            costAmount: { type: ['number', 'null'] },
            costCurrency: { type: ['string', 'null'] },
            followUpQuestion: { type: ['string', 'null'] },
            suggestedTasks: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  title: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  estimatedMinutes: { type: ['integer', 'null'] },
                  priority: {
                    type: ['string', 'null'],
                    enum: ['low', 'medium', 'high', 'critical', null],
                  },
                  reason: { type: ['string', 'null'] },
                },
                required: ['title', 'description', 'estimatedMinutes', 'priority', 'reason'],
              },
            },
          },
          required: [
            'kind',
            'title',
            'summary',
            'area',
            'track',
            'priority',
            'costAmount',
            'costCurrency',
            'followUpQuestion',
            'suggestedTasks',
          ],
        },
      },
    },
    required: ['navigatorMessage', 'items'],
  },
} as const;

export const nextActionJsonSchema = {
  name: 'next_action',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      navigatorMessage: { type: ['string', 'null'] },
      primary: {
        type: 'object',
        additionalProperties: false,
        properties: {
          taskId: { type: ['string', 'null'] },
          title: { type: 'string' },
          reason: { type: 'string' },
          estimatedMinutes: { type: 'integer' },
          area: { type: ['string', 'null'] },
        },
        required: ['taskId', 'title', 'reason', 'estimatedMinutes', 'area'],
      },
      backup: {
        type: ['object', 'null'],
        additionalProperties: false,
        properties: {
          taskId: { type: ['string', 'null'] },
          title: { type: 'string' },
          reason: { type: 'string' },
          estimatedMinutes: { type: 'integer' },
          area: { type: ['string', 'null'] },
        },
        required: ['taskId', 'title', 'reason', 'estimatedMinutes', 'area'],
      },
    },
    required: ['navigatorMessage', 'primary', 'backup'],
  },
} as const;

export const goalBreakdownJsonSchema = {
  name: 'goal_breakdown',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      navigatorMessage: { type: ['string', 'null'] },
      milestones: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            order: { type: 'integer' },
          },
          required: ['title', 'order'],
        },
      },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            estimatedMinutes: { type: ['integer', 'null'] },
            priority: {
              type: ['string', 'null'],
              enum: ['low', 'medium', 'high', 'critical', null],
            },
            reason: { type: ['string', 'null'] },
          },
          required: ['title', 'description', 'estimatedMinutes', 'priority', 'reason'],
        },
      },
      risks: { type: 'array', items: { type: 'string' } },
      blockers: { type: 'array', items: { type: 'string' } },
      firstAction: { type: 'string' },
    },
    required: ['navigatorMessage', 'milestones', 'tasks', 'risks', 'blockers', 'firstAction'],
  },
} as const;

export const solveProblemJsonSchema = {
  name: 'solve_problem',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      navigatorMessage: { type: ['string', 'null'] },
      interpretation: { type: 'string' },
      plan: { type: 'array', items: { type: 'string' } },
      suggestedTasks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            estimatedMinutes: { type: ['integer', 'null'] },
            priority: {
              type: ['string', 'null'],
              enum: ['low', 'medium', 'high', 'critical', null],
            },
            reason: { type: ['string', 'null'] },
          },
          required: ['title', 'description', 'estimatedMinutes', 'priority', 'reason'],
        },
      },
    },
    required: ['navigatorMessage', 'interpretation', 'plan', 'suggestedTasks'],
  },
} as const;

export const summarizeSearchJsonSchema = {
  name: 'summarize_search',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
    },
    required: ['summary'],
  },
} as const;

export const overviewBriefingJsonSchema = {
  name: 'overview_briefing',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      headline: { type: 'string' },
      bullets: { type: 'array', items: { type: 'string' } },
      recommendedFocus: { type: 'string' },
    },
    required: ['headline', 'bullets', 'recommendedFocus'],
  },
} as const;
