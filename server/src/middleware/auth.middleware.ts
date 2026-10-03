import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { AuthRequest, JwtPayload } from '../types/index.js';

/**
 * Verifies the Bearer token in the Authorization header.
 * On success, attaches userId and userEmail to the request object.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    (req as AuthRequest).userId = payload.sub;
    (req as AuthRequest).userEmail = payload.email;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Access token expired'));
    }
    next(new UnauthorizedError('Invalid access token'));
  }
}
