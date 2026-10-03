import axios from 'axios';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type { RawArticle } from '../../types/index.js';

const TAVILY_BASE = 'https://api.tavily.com';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
  source?: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

/**
 * Fetch news articles from Tavily Search API (free tier: 1,000 req/month).
 * Tavily is particularly useful for trending topics and breaking news.
 * Skips if TAVILY_API_KEY is not configured.
 */
export async function fetchTavilyArticles(topics: string[]): Promise<RawArticle[]> {
  if (!config.TAVILY_API_KEY) {
    logger.debug('TAVILY_API_KEY not set — skipping Tavily fetch');
    return [];
  }

  const articles: RawArticle[] = [];

  // Only fetch top-2 most important topics to conserve monthly quota
  const topTopics = topics.slice(0, 2);

  const results = await Promise.allSettled(
    topTopics.map((topic) => fetchTavilyTopic(topic)),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    }
  }

  logger.debug({ count: articles.length }, 'Tavily fetch complete');
  return articles;
}

async function fetchTavilyTopic(topic: string): Promise<RawArticle[]> {
  try {
    const response = await axios.post<TavilyResponse>(
      `${TAVILY_BASE}/search`,
      {
        query: `${topic} news`,
        topic: 'news',
        search_depth: 'basic',
        max_results: 5,
        include_answer: false,
      },
      {
        headers: {
          Authorization: `Bearer ${config.TAVILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      },
    );

    return response.data.results.map((r) => ({
      title: r.title,
      url: r.url,
      source: r.source ?? extractDomain(r.url),
      publishedAt: r.published_date ? new Date(r.published_date) : new Date(),
      snippet: r.content?.slice(0, 300),
    }));
  } catch (err) {
    logger.warn({ topic, err }, 'Tavily fetch failed — skipping topic');
    return [];
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown';
  }
}
