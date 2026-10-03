/**
 * Agent Worker — processes LangGraph briefing generation jobs from the queue.
 *
 * Listens on the briefing BullMQ queue and runs the 4-node LangGraph
 * pipeline (collect → filter → analyze → write) for each user.
 *
 * Also runs a daily briefing scheduler at 07:00 UTC for all active users.
 */
import '../config/index.js';
import { connectDatabase } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/index.js';
import { generateBriefing } from '../services/briefing.service.js';
import {
  createWorker,
  QUEUE_NAMES,
  type BriefingJobData,
} from '../queues/index.js';
import type { Job } from 'bullmq';

// ─── Briefing Job Processor ───────────────────────────────────────────────────

async function processBriefingJob(job: Job<BriefingJobData>): Promise<void> {
  const { userId, type } = job.data;
  logger.info({ jobId: job.id, userId, type }, 'Briefing job started');

  await generateBriefing(userId, type);

  logger.info({ jobId: job.id, userId }, 'Briefing job complete');
}

// ─── Daily Briefing Scheduler ─────────────────────────────────────────────────

/**
 * Runs every hour and triggers daily briefings for users whose preferred
 * frequency is 'daily' if it is 07:00 UTC (within the current hour).
 */
function startBriefingScheduler(): void {
  setInterval(() => {
    void (async () => {
      const hour = new Date().getUTCHours();
      if (hour !== 7) return; // Only run at 07:00 UTC

      logger.info('Daily briefing scheduler: generating for all users');

      const users = await User.find({
        'preferences.frequency': 'daily',
      }).select('_id').lean();

      for (const user of users) {
        try {
          await generateBriefing(user._id.toString(), 'daily');
        } catch (err) {
          logger.warn({ userId: user._id, err }, 'Daily briefing failed for user');
        }
        // 2s delay between users to avoid hammering Groq rate limits
        await new Promise((r) => setTimeout(r, 2_000));
      }
    })();
  }, 60 * 60 * 1_000); // Check every hour
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await connectDatabase();
  getRedisClient();

  // BullMQ worker (picks up on-demand briefing jobs)
  createWorker<BriefingJobData>(
    QUEUE_NAMES.BRIEFING,
    processBriefingJob,
    1, // Serial — LangGraph pipeline is sequential per user
  );

  startBriefingScheduler();

  logger.info('🤖 Agent worker started');
}

main().catch((err) => {
  logger.error({ err }, 'Agent worker crashed');
  process.exit(1);
});
