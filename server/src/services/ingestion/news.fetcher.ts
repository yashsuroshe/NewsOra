import { sha256 } from '../../utils/hash.js';
import { Article } from '../../models/index.js';
import { logger } from '../../utils/logger.js';
import { fetchRssArticles } from './rss.fetcher.js';
import { fetchGNewsArticles } from './gnews.fetcher.js';
import { fetchTavilyArticles } from './tavily.fetcher.js';
import type { RawArticle } from '../../types/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FetchResult {
  /** New articles not yet in the database */
  newArticles: RawArticle[];
  /** Total fetched before deduplication */
  totalFetched: number;
  /** Count of duplicates skipped */
  duplicatesSkipped: number;
}

// ─── URL Normalisation ────────────────────────────────────────────────────────

/**
 * Canonical URL for deduplication:
 * - Lowercase scheme + host
 * - Strip common tracking params (utm_*, ref, etc.)
 * - Remove trailing slashes and fragments
 */
export function canonicalUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    // Strip tracking query params
    const STRIP_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
      'utm_content', 'ref', 'referer', 'source', 'fbclid', 'gclid'];
    STRIP_PARAMS.forEach((p) => u.searchParams.delete(p));
    // Normalise
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    u.protocol = u.protocol.toLowerCase();
    let result = u.toString();
    if (result.endsWith('/')) result = result.slice(0, -1);
    return result;
  } catch {
    return rawUrl.toLowerCase().trim();
  }
}

/** SHA-256 of the canonical URL — used as the Article.urlHash dedup key */
export function articleUrlHash(url: string): string {
  return sha256(canonicalUrl(url));
}

// ─── Main Fetcher ─────────────────────────────────────────────────────────────

/**
 * Fetch news from all configured sources for the given topics,
 * then filter out articles already stored in the database.
 *
 * Sources: Google News RSS (primary) + GNews (if key set) + Tavily (if key set)
 */
export async function fetchNewArticles(topics: string[]): Promise<FetchResult> {
  // Run all three sources in parallel
  const [rssArticles, gnewsArticles, tavilyArticles] = await Promise.all([
    fetchRssArticles(topics),
    fetchGNewsArticles(topics),
    fetchTavilyArticles(topics),
  ]);

  const allFetched = [...rssArticles, ...gnewsArticles, ...tavilyArticles];
  const totalFetched = allFetched.length;

  logger.info(
    { rss: rssArticles.length, gnews: gnewsArticles.length, tavily: tavilyArticles.length },
    'Raw articles fetched from all sources',
  );

  // Step 1: In-memory dedup (same URL from different sources)
  const seen = new Map<string, RawArticle>();
  for (const article of allFetched) {
    const hash = articleUrlHash(article.url);
    if (!seen.has(hash)) {
      seen.set(hash, article);
    }
  }
  const deduped = [...seen.values()];

  // Step 2: DB dedup — skip articles already stored
  const hashes = [...seen.keys()];
  const existing = await Article.find(
    { urlHash: { $in: hashes } },
    { urlHash: 1 },
  ).lean();

  const existingHashes = new Set(existing.map((a) => a.urlHash));
  const newArticles = deduped.filter(
    (a) => !existingHashes.has(articleUrlHash(a.url)),
  );

  const duplicatesSkipped = totalFetched - newArticles.length;

  logger.info(
    { totalFetched, new: newArticles.length, duplicatesSkipped },
    'Ingestion fetch complete',
  );

  return { newArticles, totalFetched, duplicatesSkipped };
}
