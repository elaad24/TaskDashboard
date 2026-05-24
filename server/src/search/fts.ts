import type { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';

/**
 * Sets up FTS5 virtual tables for fast local search across the main entities,
 * plus triggers that keep them in sync with the source tables.
 *
 * Why FTS5 instead of LIKE queries?
 * - LIKE '%foo%' cannot use indexes. FTS5 builds an inverted index in SQLite
 *   itself, so search across thousands of tasks/logs stays fast.
 * - FTS5 supports prefix queries, ranking (bm25), and snippet generation out
 *   of the box.
 *
 * All statements are idempotent (`IF NOT EXISTS`), so this can run on every
 * boot without breaking. We re-sync rows once after creating each FTS table to
 * make sure existing seed data is indexed.
 */
export const setupFts = async (prisma: PrismaClient): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    // -- task_fts ---------------------------------------------------------
    await tx.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE IF NOT EXISTS task_fts USING fts5(
        title, description, reason,
        content='Task', content_rowid='rowid', tokenize='porter unicode61'
      );
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS task_ai AFTER INSERT ON Task BEGIN
        INSERT INTO task_fts(rowid, title, description, reason)
        VALUES (new.rowid, new.title, COALESCE(new.description,''), COALESCE(new.reason,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS task_ad AFTER DELETE ON Task BEGIN
        INSERT INTO task_fts(task_fts, rowid, title, description, reason)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.description,''), COALESCE(old.reason,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS task_au AFTER UPDATE ON Task BEGIN
        INSERT INTO task_fts(task_fts, rowid, title, description, reason)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.description,''), COALESCE(old.reason,''));
        INSERT INTO task_fts(rowid, title, description, reason)
        VALUES (new.rowid, new.title, COALESCE(new.description,''), COALESCE(new.reason,''));
      END;
    `);

    // -- log_fts ----------------------------------------------------------
    await tx.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE IF NOT EXISTS log_fts USING fts5(
        title, content,
        content='Log', content_rowid='rowid', tokenize='porter unicode61'
      );
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS log_ai AFTER INSERT ON Log BEGIN
        INSERT INTO log_fts(rowid, title, content)
        VALUES (new.rowid, new.title, COALESCE(new.content,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS log_ad AFTER DELETE ON Log BEGIN
        INSERT INTO log_fts(log_fts, rowid, title, content)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.content,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS log_au AFTER UPDATE ON Log BEGIN
        INSERT INTO log_fts(log_fts, rowid, title, content)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.content,''));
        INSERT INTO log_fts(rowid, title, content)
        VALUES (new.rowid, new.title, COALESCE(new.content,''));
      END;
    `);

    // -- goal_fts ---------------------------------------------------------
    await tx.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE IF NOT EXISTS goal_fts USING fts5(
        title, description, notes,
        content='Goal', content_rowid='rowid', tokenize='porter unicode61'
      );
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS goal_ai AFTER INSERT ON Goal BEGIN
        INSERT INTO goal_fts(rowid, title, description, notes)
        VALUES (new.rowid, new.title, COALESCE(new.description,''), COALESCE(new.notes,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS goal_ad AFTER DELETE ON Goal BEGIN
        INSERT INTO goal_fts(goal_fts, rowid, title, description, notes)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.description,''), COALESCE(old.notes,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS goal_au AFTER UPDATE ON Goal BEGIN
        INSERT INTO goal_fts(goal_fts, rowid, title, description, notes)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.description,''), COALESCE(old.notes,''));
        INSERT INTO goal_fts(rowid, title, description, notes)
        VALUES (new.rowid, new.title, COALESCE(new.description,''), COALESCE(new.notes,''));
      END;
    `);

    // -- problem_fts ------------------------------------------------------
    await tx.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE IF NOT EXISTS problem_fts USING fts5(
        title, description, aiInterpretation,
        content='Problem', content_rowid='rowid', tokenize='porter unicode61'
      );
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS problem_ai AFTER INSERT ON Problem BEGIN
        INSERT INTO problem_fts(rowid, title, description, aiInterpretation)
        VALUES (new.rowid, new.title, COALESCE(new.description,''), COALESCE(new.aiInterpretation,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS problem_ad AFTER DELETE ON Problem BEGIN
        INSERT INTO problem_fts(problem_fts, rowid, title, description, aiInterpretation)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.description,''), COALESCE(old.aiInterpretation,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS problem_au AFTER UPDATE ON Problem BEGIN
        INSERT INTO problem_fts(problem_fts, rowid, title, description, aiInterpretation)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.description,''), COALESCE(old.aiInterpretation,''));
        INSERT INTO problem_fts(rowid, title, description, aiInterpretation)
        VALUES (new.rowid, new.title, COALESCE(new.description,''), COALESCE(new.aiInterpretation,''));
      END;
    `);

    // -- study_fts --------------------------------------------------------
    await tx.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE IF NOT EXISTS study_fts USING fts5(
        subject, topic, notes,
        content='StudyTopic', content_rowid='rowid', tokenize='porter unicode61'
      );
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS study_ai AFTER INSERT ON StudyTopic BEGIN
        INSERT INTO study_fts(rowid, subject, topic, notes)
        VALUES (new.rowid, new.subject, new.topic, COALESCE(new.notes,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS study_ad AFTER DELETE ON StudyTopic BEGIN
        INSERT INTO study_fts(study_fts, rowid, subject, topic, notes)
        VALUES ('delete', old.rowid, old.subject, old.topic, COALESCE(old.notes,''));
      END;
    `);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS study_au AFTER UPDATE ON StudyTopic BEGIN
        INSERT INTO study_fts(study_fts, rowid, subject, topic, notes)
        VALUES ('delete', old.rowid, old.subject, old.topic, COALESCE(old.notes,''));
        INSERT INTO study_fts(rowid, subject, topic, notes)
        VALUES (new.rowid, new.subject, new.topic, COALESCE(new.notes,''));
      END;
    `);
  });

  // -- Force a full re-index from the source tables.
  // For external-content FTS5 tables (content='Log' etc.), the only safe way
  // to (re)populate the inverted index is the special 'rebuild' command --
  // a JOIN-based INSERT can be skipped silently because the virtual table
  // already reflects the source rows.
  // 'rebuild' is idempotent and cheap for the data sizes a personal tool sees.
  for (const t of ['task_fts', 'log_fts', 'goal_fts', 'problem_fts', 'study_fts']) {
    await prisma.$executeRawUnsafe(`INSERT INTO ${t}(${t}) VALUES('rebuild')`);
  }

  logger.info('FTS5 search index ready');
};

// ---------------------------------------------------------------------------
// Search query helpers
// ---------------------------------------------------------------------------

export type SearchHitRow = {
  id: string;
  type: 'task' | 'log' | 'goal' | 'problem' | 'studyTopic';
  title: string;
  snippet: string | null;
  occurredAt: string | null;
  costAmount: number | null;
  costCurrency: string | null;
  areaId: string | null;
};

/**
 * Convert a free-text query into an FTS5-safe MATCH expression.
 * - splits on whitespace
 * - quotes each term
 * - appends `*` to enable prefix matching ("groc" -> matches "grocery")
 */
const toFtsQuery = (q: string): string => {
  const terms = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/["'*\\]/g, ''))
    .filter(Boolean);
  if (terms.length === 0) return '';
  return terms.map((t) => `"${t}"*`).join(' ');
};

const TYPE_LIMIT = 25;

export const ftsSearch = async (
  prisma: PrismaClient,
  q: string,
  types: Array<'task' | 'log' | 'goal' | 'problem' | 'studyTopic'> = [
    'task',
    'log',
    'goal',
    'problem',
    'studyTopic',
  ],
): Promise<SearchHitRow[]> => {
  const match = toFtsQuery(q);
  if (!match) return [];

  const out: SearchHitRow[] = [];

  if (types.includes('task')) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        snippet: string;
        areaId: string | null;
        costAmount: number | null;
        costCurrency: string | null;
        completedAt: string | null;
        createdAt: string;
      }>
    >(
      `SELECT t.id, t.title,
              snippet(task_fts, 1, '<mark>', '</mark>', '...', 12) AS snippet,
              t.areaId, t.costAmount, t.costCurrency,
              t.completedAt, t.createdAt
       FROM task_fts
       JOIN Task t ON t.rowid = task_fts.rowid
       WHERE task_fts MATCH ?
       ORDER BY bm25(task_fts)
       LIMIT ${TYPE_LIMIT}`,
      match,
    );
    for (const r of rows) {
      out.push({
        id: r.id,
        type: 'task',
        title: r.title,
        snippet: r.snippet || null,
        occurredAt: r.completedAt ?? r.createdAt,
        costAmount: r.costAmount,
        costCurrency: r.costCurrency,
        areaId: r.areaId,
      });
    }
  }

  if (types.includes('log')) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        snippet: string;
        areaId: string | null;
        costAmount: number | null;
        costCurrency: string | null;
        occurredAt: string;
      }>
    >(
      `SELECT l.id, l.title,
              snippet(log_fts, 1, '<mark>', '</mark>', '...', 12) AS snippet,
              l.areaId, l.costAmount, l.costCurrency, l.occurredAt
       FROM log_fts
       JOIN Log l ON l.rowid = log_fts.rowid
       WHERE log_fts MATCH ?
       ORDER BY bm25(log_fts)
       LIMIT ${TYPE_LIMIT}`,
      match,
    );
    for (const r of rows) {
      out.push({
        id: r.id,
        type: 'log',
        title: r.title,
        snippet: r.snippet || null,
        occurredAt: r.occurredAt,
        costAmount: r.costAmount,
        costCurrency: r.costCurrency,
        areaId: r.areaId,
      });
    }
  }

  if (types.includes('goal')) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        snippet: string;
        areaId: string | null;
        createdAt: string;
      }>
    >(
      `SELECT g.id, g.title,
              snippet(goal_fts, 1, '<mark>', '</mark>', '...', 12) AS snippet,
              g.areaId, g.createdAt
       FROM goal_fts
       JOIN Goal g ON g.rowid = goal_fts.rowid
       WHERE goal_fts MATCH ?
       ORDER BY bm25(goal_fts)
       LIMIT ${TYPE_LIMIT}`,
      match,
    );
    for (const r of rows) {
      out.push({
        id: r.id,
        type: 'goal',
        title: r.title,
        snippet: r.snippet || null,
        occurredAt: r.createdAt,
        costAmount: null,
        costCurrency: null,
        areaId: r.areaId,
      });
    }
  }

  if (types.includes('problem')) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        snippet: string;
        areaId: string | null;
        createdAt: string;
      }>
    >(
      `SELECT p.id, p.title,
              snippet(problem_fts, 1, '<mark>', '</mark>', '...', 12) AS snippet,
              p.areaId, p.createdAt
       FROM problem_fts
       JOIN Problem p ON p.rowid = problem_fts.rowid
       WHERE problem_fts MATCH ?
       ORDER BY bm25(problem_fts)
       LIMIT ${TYPE_LIMIT}`,
      match,
    );
    for (const r of rows) {
      out.push({
        id: r.id,
        type: 'problem',
        title: r.title,
        snippet: r.snippet || null,
        occurredAt: r.createdAt,
        costAmount: null,
        costCurrency: null,
        areaId: r.areaId,
      });
    }
  }

  if (types.includes('studyTopic')) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        subject: string;
        topic: string;
        snippet: string;
        areaId: string | null;
        lastStudiedAt: string | null;
        createdAt: string;
      }>
    >(
      `SELECT s.id, s.subject, s.topic,
              snippet(study_fts, 2, '<mark>', '</mark>', '...', 12) AS snippet,
              s.areaId, s.lastStudiedAt, s.createdAt
       FROM study_fts
       JOIN StudyTopic s ON s.rowid = study_fts.rowid
       WHERE study_fts MATCH ?
       ORDER BY bm25(study_fts)
       LIMIT ${TYPE_LIMIT}`,
      match,
    );
    for (const r of rows) {
      out.push({
        id: r.id,
        type: 'studyTopic',
        title: `${r.subject} -> ${r.topic}`,
        snippet: r.snippet || null,
        occurredAt: r.lastStudiedAt ?? r.createdAt,
        costAmount: null,
        costCurrency: null,
        areaId: r.areaId,
      });
    }
  }

  // Sort cross-type by occurredAt desc
  out.sort((a, b) => {
    const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
    const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
    return bTime - aTime;
  });

  return out;
};
