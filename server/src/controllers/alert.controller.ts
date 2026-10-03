import type { Request, Response, NextFunction } from 'express';
import * as alertService from '../services/alert.service.js';
import type { AuthRequest } from '../types/index.js';

export async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20)));
    const result = await alertService.getAlerts(userId, page, limit);
    res.status(200).json({ data: result.alerts, meta: { unreadCount: result.unreadCount, page, limit } });
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const alertId = req.params['id'] ?? '';
    await alertService.markAlertRead(alertId, userId);
    res.status(200).json({ data: { message: 'Alert marked as read' } });
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const result = await alertService.markAllRead(userId);
    res.status(200).json({ data: result });
  } catch (err) { next(err); }
}
