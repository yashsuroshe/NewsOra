/**
 * Ingestion Worker — runs continuously to fetch + enrich news articles.
 *
 * Schedule:
 *  - Every 30 minutes: fetch new articles for all topics
 *  - Every 60 minutes: run embedding pipeline on un-embedded articles
 *  - Every 2 hours: run story clustering
 *
 * BullMQ also picks up manually triggered ingestion jobs from the queue.
 */
import '../config/index.js'; // Validate env first
import { connectDatabase } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { PREDEFINED_TOPICS } from '../config/feeds.js';
import { fetchNewArticles } from '../services/ingestion/news.fetcher.js';
import { runEnrichmentPipeline } from '../services/ingestion/pipeline.js';
import { embedPendingArticles } from '../services/rag/embedder.js';
import { clusterArticlesIntoStories } from '../services/story.service.js';
import {
  createWorker,
  QUEUE_NAMES,
  type IngestionJobData,
} from '../queues/index.js';
import type { Job } from 'bullmq';

// ─── Ingestion Job Processor ──────────────────────────────────────────────────

async function processIngestionJob(job: Job<IngestionJobData>): Promise<void> {
  const { topics } = job.data;
  logger.info({ jobId: job.id, topics }, 'Ingestion job started');

  const { newArticles } = await fetchNewArticles(topics);
  if (newArticles.length > 0) {
    await runEnrichmentPipeline(newArticles);
    await embedPendingArticles();
    await clusterArticlesIntoStories(24);
  }

  logger.info({ jobId: job.id, fetched: newArticles.length }, 'Ingestion job complete');
}

// ─── Scheduled Intervals ──────────────────────────────────────────────────────

function startScheduler(): void {
  // Every 30 min: fetch all topics
  setInterval(() => {
    void (async () => {
      try {
        logger.info('Scheduled fetch: starting');
        const { newArticles } = await fetchNewArticles(PREDEFINED_TOPICS);
        if (newArticles.length > 0) await runEnrichmentPipeline(newArticles);
      } catch (err) {
        logger.error({ err }, 'Scheduled fetch failed');
      }
    })();
  }, 30 * 60 * 1_000);

  // Every 60 min: embed pending articles
  setInterval(() => {
    void embedPendingArticles().catch((err) =>
      logger.error({ err }, 'Scheduled embedding failed'),
    );
  }, 60 * 60 * 1_000);

  // Every 2 hours: cluster into stories
  setInterval(() => {
    void clusterArticlesIntoStories(24).catch((err) =>
      logger.error({ err }, 'Scheduled clustering failed'),
    );
  }, 2 * 60 * 60 * 1_000);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await connectDatabase();
  getRedisClient();

  // BullMQ worker (picks up on-demand jobs)
  createWorker<IngestionJobData>(
    QUEUE_NAMES.INGESTION,
    processIngestionJob,
    2, // max 2 concurrent ingestion jobs
  );

  // Time-based scheduler
  startScheduler();

  logger.info('🔄 Ingestion worker started');

  // Run initial fetch immediately
  try {
    const { newArticles } = await fetchNewArticles(PREDEFINED_TOPICS.slice(0, 5));
    if (newArticles.length > 0) await runEnrichmentPipeline(newArticles);
  } catch (err) {
    logger.error({ err }, 'Initial ingestion failed — will retry on next interval');
  }
}

main().catch((err) => {
  logger.error({ err }, 'Ingestion worker crashed');
  process.exit(1);
});
