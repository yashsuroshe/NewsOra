import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import type { AuthRequest } from '../types/index.js';
import type { RegisterInput, LoginInput } from '../validators/auth.schema.js';
import { config } from '../config/index.js';

const COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, tokens } = await authService.register(req.body as RegisterInput);
    res.cookie(COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);
    res.status(201).json({
      data: {
        user,
        accessToken: tokens.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, tokens } = await authService.login(req.body as LoginInput);
    res.cookie(COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);
    res.status(200).json({
      data: {
        user,
        accessToken: tokens.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = (req.cookies as Record<string, string | undefined>)[COOKIE_NAME];
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token missing', code: 'UNAUTHORIZED' });
      return;
    }

    const tokens = await authService.refresh(refreshToken);
    res.cookie(COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);
    res.status(200).json({ data: { accessToken: tokens.accessToken } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    await authService.logout(userId);
    res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
    res.status(200).json({ data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const user = await authService.getMe(userId);
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
}
