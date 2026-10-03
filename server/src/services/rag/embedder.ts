import { GoogleGenAI } from '@google/genai';
import pLimit from 'p-limit';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { VectorChunk, Article } from '../../models/index.js';
import { chunkText } from './chunker.js';
import type { IArticle } from '../../models/index.js';

// ─── Client ───────────────────────────────────────────────────────────────────

const gemini = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

// Rate limit: Gemini embedding free tier — 1,500 req/min
// Process max 10 articles concurrently, each makes 1+ embedding calls
const limit = pLimit(10);

// ─── Embedding ────────────────────────────────────────────────────────────────

/**
 * Generate a 768-dimensional embedding for the given text using Gemini.
 * Uses the "RETRIEVAL_DOCUMENT" task type for chunk embedding.
 */
export async function embedText(text: string): Promise<number[]> {
  const result = await gemini.models.embedContent({
    model: 'gemini-embedding-001',
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: 768,
    },
  });

  const embedding = result.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error('Empty embedding returned from Gemini');
  }

  return embedding;
}

/**
 * Generate a query embedding — uses "RETRIEVAL_QUERY" task type for better
 * semantic search performance (different task type from document embedding).
 */
export async function embedQuery(query: string): Promise<number[]> {
  const result = await gemini.models.embedContent({
    model: 'gemini-embedding-001',
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: {
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768,
    },
  });

  const embedding = result.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error('Empty query embedding returned from Gemini');
  }

  return embedding;
}

// ─── Chunk + Store Pipeline ───────────────────────────────────────────────────

export interface EmbeddingResult {
  articleId: string;
  chunksStored: number;
}

/**
 * Chunk an article's text, generate embeddings, and store VectorChunks.
 * Idempotent: deletes existing chunks for this article before reinserting.
 */
export async function embedAndStoreArticle(article: IArticle): Promise<EmbeddingResult> {
  const textToEmbed = [article.title, article.summary, article.content]
    .filter(Boolean)
    .join('\n\n');

  const chunks = chunkText(textToEmbed);
  if (chunks.length === 0) {
    logger.debug({ articleId: article._id }, 'No chunks generated — skipping embedding');
    return { articleId: article._id.toString(), chunksStored: 0 };
  }

  // Delete stale chunks for this article (re-embedding after update)
  await VectorChunk.deleteMany({ articleId: article._id });

  // Generate embeddings concurrently (each chunk = 1 API call)
  const chunkDocs = await Promise.all(
    chunks.map(async (chunk) => {
      const embedding = await embedText(chunk.text);
      return {
        articleId: article._id,
        chunkIndex: chunk.index,
        text: chunk.text,
        embedding,
        metadata: {
          source: article.source,
          topics: article.topics,
          publishedAt: article.publishedAt,
          url: article.url,
          title: article.title,
        },
      };
    }),
  );

  await VectorChunk.insertMany(chunkDocs);

  logger.debug(
    { articleId: article._id, chunks: chunkDocs.length },
    'Article embedded and stored',
  );

  return { articleId: article._id.toString(), chunksStored: chunkDocs.length };
}

/**
 * Embed all un-embedded articles in the database.
 * Finds articles with no corresponding VectorChunks and processes them.
 */
export async function embedPendingArticles(): Promise<{ processed: number; failed: number }> {
  // Find article IDs that already have chunks
  const embeddedIds = await VectorChunk.distinct('articleId');

  // Find articles not yet embedded
  const pending = await Article.find({
    _id: { $nin: embeddedIds },
    $or: [
      { content: { $ne: '', $exists: true } },
      { summary: { $ne: '', $exists: true } },
    ],
  }).limit(100); // Process in batches of 100

  if (pending.length === 0) {
    logger.info('No pending articles to embed');
    return { processed: 0, failed: 0 };
  }

  logger.info({ count: pending.length }, 'Embedding pending articles');

  let processed = 0;
  let failed = 0;

  await Promise.all(
    pending.map((article) =>
      limit(async () => {
        try {
          await embedAndStoreArticle(article);
          processed++;
        } catch (err) {
          failed++;
          logger.warn({ articleId: article._id, err }, 'Embedding failed — skipping');
        }
      }),
    ),
  );

  logger.info({ processed, failed }, 'Embedding batch complete');
  return { processed, failed };
}
