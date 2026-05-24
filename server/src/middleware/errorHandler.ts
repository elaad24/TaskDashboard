import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isProd } from '../env.js';
import { logger } from '../logger.js';

export class HttpError extends Error {
  status: number;
  code: string;
  override cause?: unknown;

  constructor(status: number, code: string, message: string, cause?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.error({ err }, 'HttpError');
    } else {
      logger.warn({ status: err.status, code: err.code }, err.message);
    }
    res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
      ...(isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    },
  });
};
