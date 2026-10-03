import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // Operational errors (AppError subclasses)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details && { details: err.details }),
    });
    return;
  }

  // Unexpected errors
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error({ err: error }, 'Unhandled error');

  res.status(500).json({
    error:
      config.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
    code: 'INTERNAL_ERROR',
  });
};
