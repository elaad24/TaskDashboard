import { Router } from 'express';
import { searchInputSchema, type SearchResponse } from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../db.js';
import { ftsSearch } from '../search/fts.js';
import { summarizeSearch } from '../ai/navigator.js';

export const searchRouter = Router();

searchRouter.get(
  '/',
  validate(searchInputSchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = (req.query as { q: string }).q;
    const types = (req.query as { types?: SearchResponse['hits'][number]['type'][] }).types;
    const summarize = (req.query as { summarize?: boolean }).summarize ?? true;

    const hits = await ftsSearch(prisma, q, types);

    let totalCost: number | null = 0;
    let totalMinutes: number | null = 0;
    let costPresent = false;
    let minutesPresent = false;

    // For aggregate totals we ask the DB directly so summing is correct even
    // if there are more matching rows than `hits` we kept after FTS LIMIT.
    if (q && (!types || types.includes('log'))) {
      const tokens = q.trim().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        const conditions = tokens.map(() => '(l.title LIKE ? OR l.content LIKE ?)').join(' AND ');
        const params: Array<string> = [];
        for (const t of tokens) {
          const like = `%${t}%`;
          params.push(like, like);
        }
        const sumRows = await prisma.$queryRawUnsafe<
          Array<{ totalCost: number | null; totalMinutes: number | bigint | null }>
        >(
          `SELECT
              SUM(l.costAmount) as totalCost,
              SUM(l.timeSpentMinutes) as totalMinutes
           FROM Log l
           WHERE ${conditions}`,
          ...params,
        );
        const row = sumRows[0];
        if (row) {
          // SQLite's SUM over an INTEGER column comes back as BigInt through
          // Prisma's raw query path. Convert before JSON.stringify chokes.
          const minsRaw = row.totalMinutes;
          totalCost = row.totalCost ?? null;
          totalMinutes =
            typeof minsRaw === 'bigint'
              ? Number(minsRaw)
              : (minsRaw ?? null);
          costPresent = totalCost !== null;
          minutesPresent = totalMinutes !== null;
        }
      }
    }

    const totals = {
      count: hits.length,
      totalCost: costPresent ? totalCost : null,
      totalMinutes: minutesPresent ? totalMinutes : null,
    };

    let summary: string | null = null;
    if (summarize && hits.length > 0) {
      try {
        summary = await summarizeSearch(q, hits, totals);
      } catch {
        summary = null;
      }
    }

    const body: SearchResponse = {
      hits: hits.map((h) => ({
        id: h.id,
        type: h.type,
        title: h.title,
        snippet: h.snippet,
        occurredAt: h.occurredAt,
        costAmount: h.costAmount,
        costCurrency: h.costCurrency,
        areaId: h.areaId,
      })),
      summary,
      totals,
    };

    res.json(body);
  }),
);
