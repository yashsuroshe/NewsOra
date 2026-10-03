import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis.js';

export const liveness = (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
};

export const readiness = async (_req: Request, res: Response): Promise<void> => {
  const deps = {
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: 'disconnected' as string,
  };

  try {
    const redis = getRedisClient();
    await redis.ping();
    deps.redis = 'connected';
  } catch {
    deps.redis = 'disconnected';
  }

  const allHealthy = Object.values(deps).every((v) => v === 'connected');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    dependencies: deps,
  });
};
