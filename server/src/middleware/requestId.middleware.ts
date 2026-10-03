import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Attaches a unique correlation ID to every request.
 * Used for tracing requests across logs without logging PII.
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = (req.headers['x-request-id'] as string) ?? randomUUID();
  (req as Request & { id: string }).id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
