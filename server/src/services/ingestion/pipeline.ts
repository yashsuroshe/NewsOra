import pLimit from 'p-limit';
import { Article } from '../../models/index.js';
import { logger } from '../../utils/logger.js';
import { articleUrlHash } from './news.fetcher.js';
import { extractArticleContent } from './extractor.js';
import { enrichArticle } from './enricher.js';
import type { RawArticle, EnrichedArticle } from '../../types/index.js';

// Process at most 5 articles concurrently to avoid rate-limiting LLM APIs
const limit = pLimit(5);

export interface PipelineResult {
  saved: number;
  failed: number;
  articles: EnrichedArticle[];
}

/**
 * Run the full extraction + enrichment + save pipeline for a batch of raw articles.
 * Each article is processed concurrently (up to 5 at a time).
 * Failures are logged and skipped — the pipeline never throws.
 */
export async function runEnrichmentPipeline(
  rawArticles: RawArticle[],
): Promise<PipelineResult> {
  let saved = 0;
  let failed = 0;
  const enrichedArticles: EnrichedArticle[] = [];

  const tasks = rawArticles.map((article) =>
    limit(async () => {
      try {
        // Step 1: Extract full content (graceful fallback to snippet)
        const content = await extractArticleContent(article.url);

        // Step 2: LLM enrichment
        const enriched = await enrichArticle(article, content);
        enrichedArticles.push(enriched);

        // Step 3: Save to MongoDB (upsert by urlHash)
        const urlHash = articleUrlHash(article.url);
        await Article.findOneAndUpdate(
          { urlHash },
          {
            $setOnInsert: {
              urlHash,
              title: enriched.title,
              url: enriched.url,
              source: enriched.source,
              publishedAt: enriched.publishedAt,
            },
            $set: {
              content: enriched.content,
              summary: enriched.summary,
              topics: enriched.topics,
              importance: enriched.importance,
              entities: enriched.entities,
            },
          },
          { upsert: true, new: true },
        );

        saved++;
        logger.debug({ url: article.url }, 'Article saved');
      } catch (err) {
        failed++;
        logger.warn({ url: article.url, err }, 'Article pipeline failed — skipping');
      }
    }),
  );

  await Promise.all(tasks);

  logger.info({ saved, failed, total: rawArticles.length }, 'Enrichment pipeline complete');
  return { saved, failed, articles: enrichedArticles };
}
