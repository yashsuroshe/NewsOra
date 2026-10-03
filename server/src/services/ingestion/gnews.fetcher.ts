import axios from 'axios';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type { RawArticle } from '../../types/index.js';

const GNEWS_BASE = 'https://gnews.io/api/v4';
const MAX_ARTICLES = 10; // Free tier: 10 per request

interface GNewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}

interface GNewsResponse {
  articles: GNewsArticle[];
  totalArticles: number;
}

/**
 * Fetch articles from GNews API (free tier: 100 req/day, 10 articles/request).
 * Skips if GNEWS_API_KEY is not configured.
 */
export async function fetchGNewsArticles(topics: string[]): Promise<RawArticle[]> {
  if (!config.GNEWS_API_KEY) {
    logger.debug('GNEWS_API_KEY not set — skipping GNews fetch');
    return [];
  }

  const articles: RawArticle[] = [];

  // Fetch top-3 topics concurrently to stay within daily quota
  const topTopics = topics.slice(0, 3);

  const results = await Promise.allSettled(
    topTopics.map((topic) => fetchGNewsTopic(topic)),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    }
  }

  logger.debug({ count: articles.length }, 'GNews fetch complete');
  return articles;
}

async function fetchGNewsTopic(topic: string): Promise<RawArticle[]> {
  try {
    const response = await axios.get<GNewsResponse>(`${GNEWS_BASE}/search`, {
      params: {
        q: topic,
        lang: 'en',
        country: 'us',
        max: MAX_ARTICLES,
        apikey: config.GNEWS_API_KEY,
        sortby: 'publishedAt',
      },
      timeout: 10_000,
    });

    return response.data.articles.map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source.name,
      publishedAt: new Date(a.publishedAt),
      snippet: a.description?.slice(0, 300),
    }));
  } catch (err) {
    logger.warn({ topic, err }, 'GNews fetch failed — skipping topic');
    return [];
  }
}
