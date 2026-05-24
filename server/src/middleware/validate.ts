import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Returns an Express middleware that validates `req[source]` against the given
 * Zod schema. On success, the parsed (and possibly transformed) value is
 * assigned back so downstream handlers see the typed shape. On failure the
 * ZodError is forwarded to the central error handler.
 *
 * Why validate at the edge?
 * - The repo's review standards require us to never trust client input. Doing
 *   the parsing here means our service layer can rely on the inputs being
 *   already-validated TypeScript values, not `any`.
 */
export const validate =
  <T>(schema: ZodSchema<T>, source: Source = 'body'): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const value = schema.parse(req[source]);
      // Reassign, but for `query` and `params` Express types make these
      // read-only; we cast through unknown safely since we just produced `value`.
      (req as unknown as Record<string, unknown>)[source] = value;
      next();
    } catch (err) {
      next(err);
    }
  };
