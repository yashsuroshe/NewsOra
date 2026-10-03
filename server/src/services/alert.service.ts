import { Alert } from '../models/index.js';
import { emitAlertToUser } from '../sockets/socket.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface CreateAlertInput {
  userId: string;
  topic: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  importance: number;
}

/**
 * Create and immediately push an alert to the user via Socket.io.
 */
export async function createAlert(input: CreateAlertInput): Promise<object> {
  const alert = await Alert.create(input);
  // Real-time push
  emitAlertToUser(input.userId, { ...alert.toJSON(), _id: alert._id.toString() });
  logger.info({ userId: input.userId, topic: input.topic }, 'Alert created and pushed');
  return alert;
}

/**
 * Get unread alerts for a user (newest first).
 */
export async function getAlerts(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{ alerts: object[]; unreadCount: number }> {
  const [alerts, unreadCount] = await Promise.all([
    Alert.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Alert.countDocuments({ userId, read: false }),
  ]);
  return { alerts, unreadCount };
}

/**
 * Mark a specific alert as read.
 */
export async function markAlertRead(alertId: string, userId: string): Promise<void> {
  const alert = await Alert.findOneAndUpdate(
    { _id: alertId, userId },
    { $set: { read: true } },
  );
  if (!alert) throw new NotFoundError('Alert');
}

/**
 * Mark all alerts as read for a user.
 */
export async function markAllRead(userId: string): Promise<{ updated: number }> {
  const result = await Alert.updateMany(
    { userId, read: false },
    { $set: { read: true } },
  );
  return { updated: result.modifiedCount };
}

/**
 * Scan high-importance articles and generate alerts for subscribed users.
 * Called by the ingestion worker after enrichment.
 */
export async function checkAndCreateAlerts(
  userId: string,
  topics: string[],
  minImportance = 8,
): Promise<void> {
  const { Article } = await import('../models/index.js');

  const highImpactArticles = await Article.find({
    topics: { $in: topics },
    importance: { $gte: minImportance },
    publishedAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // last 2 hours
  })
    .sort({ importance: -1 })
    .limit(3)
    .lean();

  for (const article of highImpactArticles) {
    // Check if we already sent this alert
    const existing = await Alert.findOne({ userId, url: article.url });
    if (existing) continue;

    await createAlert({
      userId,
      topic: article.topics[0] ?? 'General',
      title: article.title,
      summary: article.summary,
      url: article.url,
      source: article.source,
      importance: article.importance,
    });
  }
}
