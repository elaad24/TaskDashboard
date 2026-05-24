import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so that thrown errors are forwarded to
 * Express's `next(err)` instead of crashing the server. Express 4 doesn't
 * await promises returned from handlers; this is the standard idiom.
 */
export const asyncHandler =
  <P = unknown, ResBody = unknown, ReqBody = unknown, ReqQuery = unknown>(
    fn: (
      req: Request<P, ResBody, ReqBody, ReqQuery>,
      res: Response<ResBody>,
      next: NextFunction,
    ) => Promise<unknown> | unknown,
  ): RequestHandler<P, ResBody, ReqBody, ReqQuery> =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
