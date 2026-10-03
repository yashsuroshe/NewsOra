import type { Request, Response, NextFunction } from 'express';
import * as preferencesService from '../services/preferences.service.js';
import type { AuthRequest } from '../types/index.js';
import type { UpdatePreferencesInput } from '../validators/preferences.schema.js';

// ─── GET /api/v1/preferences ──────────────────────────────────────────────────

export async function getPreferences(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const result = await preferencesService.getPreferences(userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/v1/preferences ──────────────────────────────────────────────────

export async function updatePreferences(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const user = await preferencesService.updatePreferences(
      userId,
      req.body as UpdatePreferencesInput,
    );
    res.status(200).json({ data: { preferences: user.preferences } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/preferences/topics ─────────────────────────────────────────

export async function addTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const { topic } = req.body as { topic: string };
    const user = await preferencesService.addTopic(userId, topic);
    res.status(200).json({ data: { topics: user.preferences.topics } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/preferences/topics/:topic ────────────────────────────────

export async function removeTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const topic = req.params['topic'];
    if (!topic) {
      res.status(400).json({ error: 'Topic param is required', code: 'VALIDATION_ERROR' });
      return;
    }
    const user = await preferencesService.removeTopic(userId, topic);
    res.status(200).json({ data: { topics: user.preferences.topics } });
  } catch (err) {
    next(err);
  }
}
