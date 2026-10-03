import type { Request, Response, NextFunction } from 'express';
import * as briefingService from '../services/briefing.service.js';
import type { AuthRequest } from '../types/index.js';

// POST /api/v1/briefings/generate
export async function generateBriefing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const type = (req.body as { type?: string }).type === 'weekly' ? 'weekly' : 'daily';
    const briefing = await briefingService.generateBriefing(userId, type);
    res.status(201).json({ data: briefing });
  } catch (err) { next(err); }
}

// GET /api/v1/briefings
export async function getBriefings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(20, Math.max(1, Number(req.query['limit'] ?? 10)));
    const result = await briefingService.getBriefings(userId, page, limit);
    res.status(200).json({ data: result.briefings, meta: { total: result.total, page, limit } });
  } catch (err) { next(err); }
}

// GET /api/v1/briefings/:id
export async function getBriefing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const briefingId = req.params['id'] ?? '';
    const briefing = await briefingService.getBriefing(briefingId, userId);
    res.status(200).json({ data: briefing });
  } catch (err) { next(err); }
}
