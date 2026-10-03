import mongoose from 'mongoose';
import { VectorChunk, Article } from '../../models/index.js';
import { embedQuery } from './embedder.js';
import { logger } from '../../utils/logger.js';
import type { VectorSearchResult } from '../../types/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchOptions {
  topics?: string[];
  maxResults?: number;
  minImportance?: number;
  publishedAfter?: Date;
}

export interface HybridSearchResult {
  vectorResults: VectorSearchResult[];
  articles: Array<{
    _id: string;
    title: string;
    summary: string;
    source: string;
    url: string;
    publishedAt: Date;
    topics: string[];
    importance: number;
  }>;
}

// ─── Vector Search ────────────────────────────────────────────────────────────

/**
 * Atlas Vector Search using the HNSW index on the `embedding` field.
 * Pre-filters by topics and date if provided.
 *
 * Note: The index named "vector_index" must be created via create-vector-index.ts.
 */
async function vectorSearch(
  queryEmbedding: number[],
  options: SearchOptions,
): Promise<VectorSearchResult[]> {
  const { topics, maxResults = 10, publishedAfter } = options;

  // Build pre-filter for Atlas Vector Search
  const preFilter: Record<string, unknown> = {};
  if (topics && topics.length > 0) {
    preFilter['metadata.topics'] = { $in: topics };
  }
  if (publishedAfter) {
    preFilter['metadata.publishedAt'] = { $gte: publishedAfter };
  }

  const pipeline: mongoose.PipelineStage[] = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: maxResults * 10,
        limit: maxResults,
        ...(Object.keys(preFilter).length > 0 && { filter: preFilter }),
      },
    } as mongoose.PipelineStage,
    {
      $project: {
        text: 1,
        metadata: 1,
        score: { $meta: 'vectorSearchScore' },
        _id: 0,
      },
    },
  ];

  const results = await VectorChunk.aggregate(pipeline);

  return results.map((r) => ({
    text: r.text as string,
    score: r.score as number,
    metadata: r.metadata as VectorSearchResult['metadata'],
  }));
}

// ─── Keyword Search ───────────────────────────────────────────────────────────

/**
 * Fallback keyword search on the Article collection.
 * Used when Atlas Vector Search index is not yet active (e.g., local dev).
 */
async function keywordSearch(
  query: string,
  options: SearchOptions,
): Promise<HybridSearchResult['articles']> {
  const { topics, maxResults = 10, minImportance = 1, publishedAfter } = options;

  const filter: Record<string, unknown> = {
    $text: { $search: query },
  };
  if (topics?.length) filter['topics'] = { $in: topics };
  if (minImportance > 1) filter['importance'] = { $gte: minImportance };
  if (publishedAfter) filter['publishedAt'] = { $gte: publishedAfter };

  const articles = await Article.find(filter)
    .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
    .limit(maxResults)
    .select('title summary source url publishedAt topics importance')
    .lean();

  return articles.map((a) => ({
    _id: a._id.toString(),
    title: a.title,
    summary: a.summary,
    source: a.source,
    url: a.url,
    publishedAt: a.publishedAt,
    topics: a.topics,
    importance: a.importance,
  }));
}

// ─── Hybrid Search ────────────────────────────────────────────────────────────

/**
 * Hybrid search: vector search (semantic) + keyword search (lexical).
 * Attempts Atlas Vector Search first; falls back to keyword-only if unavailable.
 *
 * Results are deduplicated by articleId and ranked by vector score.
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions = {},
): Promise<HybridSearchResult> {
  const { maxResults = 10 } = options;

  let vectorResults: VectorSearchResult[] = [];
  let keywordArticles: HybridSearchResult['articles'] = [];

  // ── Vector Search (primary) ──────────────────────────────────────────────
  try {
    const queryEmbedding = await embedQuery(query);
    vectorResults = await vectorSearch(queryEmbedding, options);
  } catch (err) {
    logger.warn({ err }, 'Vector search failed — falling back to keyword only');
  }

  // ── Keyword Search (always run as supplementary) ─────────────────────────
  try {
    keywordArticles = await keywordSearch(query, { ...options, maxResults });
  } catch {
    // Keyword search may fail if no text index — silently skip
  }

  // ── Deduplicate + Fetch Article metadata for vector results ──────────────
  const vectorArticleUrls = new Set(vectorResults.map((r) => r.metadata.url));
  const vectorArticleIds = vectorResults.map((r) => r.metadata.articleId);

  const vectorArticleData = await Article.find({
    _id: { $in: vectorArticleIds },
  })
    .select('title summary source url publishedAt topics importance')
    .lean();

  const vectorArticles: HybridSearchResult['articles'] = vectorArticleData.map((a) => ({
    _id: a._id.toString(),
    title: a.title,
    summary: a.summary,
    source: a.source,
    url: a.url,
    publishedAt: a.publishedAt,
    topics: a.topics,
    importance: a.importance,
  }));

  // Merge: vector results first (semantic), then keyword results not already included
  const merged = [
    ...vectorArticles,
    ...keywordArticles.filter((a) => !vectorArticleUrls.has(a.url)),
  ].slice(0, maxResults);

  return { vectorResults, articles: merged };
}
