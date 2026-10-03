import { Article, Story } from '../models/index.js';
import { hybridSearch } from '../services/rag/search.js';
import { logger } from '../utils/logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArticleSeed {
  _id: string;
  title: string;
  summary: string;
  topics: string[];
  importance: number;
  publishedAt: Date;
  url: string;
  source: string;
}

// ─── Clustering Logic ─────────────────────────────────────────────────────────

/**
 * Cluster recent articles into stories using title/topic similarity.
 * Strategy: for each high-importance article, find related articles via
 * hybrid search, then group them into a Story if ≥2 articles cover the
 * same event (defined as: same primary topic + similar title keywords).
 *
 * This is a lightweight TF-IDF-free approach suitable for the free tier
 * (no external clustering service needed).
 */
export async function clusterArticlesIntoStories(
  hoursBack = 24,
): Promise<number> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  // Get recent high-importance articles as seeds
  const seeds = await Article.find({
    publishedAt: { $gte: since },
    importance: { $gte: 6 },
  })
    .sort({ importance: -1 })
    .limit(50)
    .lean() as unknown as ArticleSeed[];

  if (seeds.length === 0) return 0;

  let storiesCreated = 0;
  const processedIds = new Set<string>();

  for (const seed of seeds) {
    if (processedIds.has(seed._id.toString())) continue;

    // Find semantically related articles via search
    const { articles: related } = await hybridSearch(seed.title, {
      topics: seed.topics,
      maxResults: 8,
      publishedAfter: since,
    });

    // Filter to truly related articles (same primary topic, minimum 3 matches)
    const seedWords = extractKeywords(seed.title);
    const cluster = related.filter((a) => {
      if (a._id === seed._id.toString()) return true;
      if (processedIds.has(a._id)) return false;
      const aWords = extractKeywords(a.title);
      const overlap = seedWords.filter((w) => aWords.includes(w)).length;
      return overlap >= 2 && a.topics.some((t) => seed.topics.includes(t));
    });

    if (cluster.length < 2) continue; // Need at least 2 articles for a story

    // Mark all cluster articles as processed
    cluster.forEach((a) => processedIds.add(a._id));
    processedIds.add(seed._id.toString());

    // Check if a story for this cluster already exists
    const articleIds = cluster.map((a) => a._id);
    const existing = await Story.findOne({ articleIds: { $in: articleIds } });
    if (existing) continue;

    // Create story
    await Story.create({
      headline: seed.title,
      summary: seed.summary,
      topics: seed.topics,
      importance: Math.max(...cluster.map((a) => a.importance)),
      articleIds: [seed._id, ...cluster.map((a) => a._id)],
      publishedAt: seed.publishedAt,
    });

    storiesCreated++;
  }

  logger.info({ storiesCreated, seeds: seeds.length }, 'Story clustering complete');
  return storiesCreated;
}

/**
 * Get recent stories (newest, highest importance first).
 */
export async function getStories(
  topics?: string[],
  limit = 20,
  page = 1,
): Promise<{ stories: object[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (topics?.length) filter['topics'] = { $in: topics };

  const [stories, total] = await Promise.all([
    Story.find(filter)
      .sort({ importance: -1, publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Story.countDocuments(filter),
  ]);

  return { stories, total };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'will', 'would', 'could', 'should', 'may', 'might',
  'its', 'it', 'as', 'up', 'new', 'over', 'after', 'says', 'said',
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}
