import RssParser from 'rss-parser';
import { TOPIC_FEEDS } from '../../config/feeds.js';
import { logger } from '../../utils/logger.js';
import type { RawArticle } from '../../types/index.js';

const parser = new RssParser({
  timeout: 10_000,
  customFields: {
    item: [['media:content', 'mediaContent']],
  },
});

/**
 * Fetch articles from Google News RSS for the given topics.
 * Falls back gracefully if a feed fails — other feeds continue.
 */
export async function fetchRssArticles(topics: string[]): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];

  // Collect feed URLs for the requested topics
  const feedUrls = new Set<string>();
  for (const topic of topics) {
    const urls = TOPIC_FEEDS[topic] ?? [];
    urls.forEach((u) => feedUrls.add(u));
  }

  // Fetch all feeds concurrently (up to 10 at a time)
  const chunks = chunkArray([...feedUrls], 10);

  for (const chunk of chunks) {
    const results = await Promise.allSettled(chunk.map((url) => fetchSingleFeed(url)));

    for (const result of results) {
      if (result.status === 'fulfilled') {
        articles.push(...result.value);
      }
    }
  }

  logger.debug({ count: articles.length, topics }, 'RSS fetch complete');
  return articles;
}

async function fetchSingleFeed(url: string): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(url);
    const articles: RawArticle[] = [];

    for (const item of feed.items ?? []) {
      const link = item.link ?? item.guid;
      if (!link || !item.title) continue;

      articles.push({
        title: item.title.trim(),
        url: link,
        source: feed.title ?? extractDomain(link),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        snippet: item.contentSnippet?.slice(0, 300) ?? item.summary?.slice(0, 300),
      });
    }

    return articles;
  } catch (err) {
    logger.warn({ url, err }, 'RSS feed fetch failed — skipping');
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

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
