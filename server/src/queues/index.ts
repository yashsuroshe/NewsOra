import { Queue, Worker, type Job } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// ─── Connection ───────────────────────────────────────────────────────────────

const connection = getRedisClient();

// ─── Queue Names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  INGESTION: 'ingestion',
  BRIEFING: 'briefing',
  EMBEDDING: 'embedding',
} as const;

// ─── Job Data Types ───────────────────────────────────────────────────────────

export interface IngestionJobData {
  topics: string[];
  triggeredBy: 'schedule' | 'manual';
}

export interface BriefingJobData {
  userId: string;
  type: 'daily' | 'weekly';
}

export interface EmbeddingJobData {
  articleIds: string[];
}

// ─── Queues ───────────────────────────────────────────────────────────────────

export const ingestionQueue = new Queue<IngestionJobData>(QUEUE_NAMES.INGESTION, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

export const briefingQueue = new Queue<BriefingJobData>(QUEUE_NAMES.BRIEFING, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const embeddingQueue = new Queue<EmbeddingJobData>(QUEUE_NAMES.EMBEDDING, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
});

// ─── Queue Helpers ────────────────────────────────────────────────────────────

export async function scheduleIngestion(topics: string[]): Promise<void> {
  await ingestionQueue.add('fetch-articles', { topics, triggeredBy: 'manual' });
  logger.info({ topics }, 'Ingestion job queued');
}

export async function scheduleBriefing(userId: string, type: 'daily' | 'weekly'): Promise<void> {
  await briefingQueue.add(`briefing-${userId}`, { userId, type }, {
    // Deduplicate: only one pending briefing per user
    jobId: `briefing-${userId}-${type}`,
  });
  logger.info({ userId, type }, 'Briefing job queued');
}

// ─── Worker Factory ───────────────────────────────────────────────────────────

export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  concurrency = 3,
): Worker<T> {
  const worker = new Worker<T>(queueName, processor, { connection, concurrency });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: queueName }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, queue: queueName, err }, 'Job failed');
  });

  return worker;
}
