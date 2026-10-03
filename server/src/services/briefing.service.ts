import { Briefing, User } from '../models/index.js';
import { runBriefingAgent } from '../agents/briefing.agent.js';
import { scheduleBriefing } from '../queues/index.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Generate a briefing for the user immediately (synchronous, for on-demand requests).
 * Saves the result to the Briefing collection.
 */
export async function generateBriefing(
  userId: string,
  type: 'daily' | 'weekly' = 'daily',
): Promise<object> {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  logger.info({ userId, type }, 'Generating briefing');

  const output = await runBriefingAgent(userId, type);

  const briefing = await Briefing.create({
    userId,
    type,
    content: output.content,
    sections: output.sections,
    articleCount: output.articleCount,
    generatedAt: new Date(),
  });

  return briefing;
}

/**
 * Queue a briefing for async generation (used by the scheduler).
 */
export async function queueBriefing(
  userId: string,
  type: 'daily' | 'weekly',
): Promise<void> {
  await scheduleBriefing(userId, type);
}

/**
 * Get a user's briefing history (newest first, paginated).
 */
export async function getBriefings(
  userId: string,
  page = 1,
  limit = 10,
): Promise<{ briefings: object[]; total: number }> {
  const [briefings, total] = await Promise.all([
    Briefing.find({ userId })
      .sort({ generatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Briefing.countDocuments({ userId }),
  ]);
  return { briefings, total };
}

/**
 * Get a single briefing by ID (with ownership check).
 */
export async function getBriefing(briefingId: string, userId: string): Promise<object> {
  const briefing = await Briefing.findOne({ _id: briefingId, userId }).lean();
  if (!briefing) throw new NotFoundError('Briefing');
  return briefing;
}
