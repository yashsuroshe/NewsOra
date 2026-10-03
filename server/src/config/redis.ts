import { Redis } from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      lazyConnect: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 500, 5000);
        logger.warn({ attempt: times, delayMs: delay }, 'Redis reconnecting');
        return delay;
      },
    });

    redisClient.on('connect', () => logger.info('✅ Redis connected'));
    redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));
    redisClient.on('reconnecting', () => logger.warn('Redis reconnecting'));
  }
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
}
