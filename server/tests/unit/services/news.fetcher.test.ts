import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canonicalUrl, articleUrlHash, fetchNewArticles } from '../../../src/services/ingestion/news.fetcher.js';
import type { RawArticle } from '../../../src/types/index.js';

// ─── Mock all three fetchers ──────────────────────────────────────────────────

vi.mock('../../../src/services/ingestion/rss.fetcher.js', () => ({
  fetchRssArticles: vi.fn(),
}));

vi.mock('../../../src/services/ingestion/gnews.fetcher.js', () => ({
  fetchGNewsArticles: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../src/services/ingestion/tavily.fetcher.js', () => ({
  fetchTavilyArticles: vi.fn().mockResolvedValue([]),
}));

// Mock Article model to avoid real DB calls
vi.mock('../../../src/models/index.js', () => ({
  Article: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

import { fetchRssArticles } from '../../../src/services/ingestion/rss.fetcher.js';
import { Article } from '../../../src/models/index.js';

// ─── Test Data ────────────────────────────────────────────────────────────────

const makeArticle = (url: string): RawArticle => ({
  title: `Article from ${url}`,
  url,
  source: 'TestSource',
  publishedAt: new Date('2025-01-01'),
  snippet: 'Test snippet',
});

describe('canonicalUrl', () => {
  it('strips utm params', () => {
    const raw = 'https://example.com/article?utm_source=google&utm_medium=cpc&id=123';
    const canonical = canonicalUrl(raw);
    expect(canonical).toBe('https://example.com/article?id=123');
  });

  it('removes trailing slash', () => {
    expect(canonicalUrl('https://example.com/article/')).toBe('https://example.com/article');
  });

  it('lowercases the hostname', () => {
    expect(canonicalUrl('https://EXAMPLE.COM/article')).toBe('https://example.com/article');
  });

  it('removes fragments', () => {
    expect(canonicalUrl('https://example.com/article#section')).toBe('https://example.com/article');
  });
});

describe('articleUrlHash', () => {
  it('produces the same hash for URLs that differ only in utm params', () => {
    const h1 = articleUrlHash('https://example.com/article?utm_source=newsletter');
    const h2 = articleUrlHash('https://example.com/article?utm_source=twitter');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different articles', () => {
    const h1 = articleUrlHash('https://example.com/article-1');
    const h2 = articleUrlHash('https://example.com/article-2');
    expect(h1).not.toBe(h2);
  });
});

describe('fetchNewArticles', () => {
  beforeEach(() => {
    vi.mocked(fetchRssArticles).mockResolvedValue([]);
    vi.mocked(Article.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
  });

  it('UT-FETCH-01: deduplicates same URL from multiple sources', async () => {
    const url = 'https://techcrunch.com/article-1';
    vi.mocked(fetchRssArticles).mockResolvedValue([makeArticle(url), makeArticle(url)]);

    const result = await fetchNewArticles(['AI']);

    expect(result.newArticles).toHaveLength(1);
    expect(result.totalFetched).toBe(2);
    expect(result.duplicatesSkipped).toBe(1);
  });

  it('UT-FETCH-02: deduplicates UTM-variant URLs', async () => {
    vi.mocked(fetchRssArticles).mockResolvedValue([
      makeArticle('https://example.com/news?utm_source=twitter'),
      makeArticle('https://example.com/news?utm_source=facebook'),
    ]);

    const result = await fetchNewArticles(['Tech']);

    expect(result.newArticles).toHaveLength(1);
  });

  it('UT-FETCH-03: skips articles already in DB', async () => {
    const url = 'https://existing.com/article';
    vi.mocked(fetchRssArticles).mockResolvedValue([makeArticle(url)]);
    vi.mocked(Article.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ urlHash: articleUrlHash(url) }]),
    } as never);

    const result = await fetchNewArticles(['AI']);

    expect(result.newArticles).toHaveLength(0);
    expect(result.duplicatesSkipped).toBe(1);
  });

  it('UT-FETCH-04: returns all new articles when no duplicates', async () => {
    vi.mocked(fetchRssArticles).mockResolvedValue([
      makeArticle('https://example.com/a'),
      makeArticle('https://example.com/b'),
      makeArticle('https://example.com/c'),
    ]);

    const result = await fetchNewArticles(['AI']);

    expect(result.newArticles).toHaveLength(3);
    expect(result.duplicatesSkipped).toBe(0);
  });
});
