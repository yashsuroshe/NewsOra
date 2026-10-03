import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors.js';

type Source = 'body' | 'query' | 'params';

/**
 * Middleware factory — validates req[source] against a Zod schema.
 * On success, replaces req[source] with the parsed (typed) data.
 * On failure, throws a ValidationError with field-level details.
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const key = err.path.join('.') || 'value';
        details[key] = err.message;
      });
      return next(new ValidationError(details));
    }

    // Replace with Zod-parsed data (trimmed, typed, defaults applied)
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
