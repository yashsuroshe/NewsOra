import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { hybridSearch } from '../services/rag/search.js';
import { Article } from '../models/index.js';
import type { AuthRequest } from '../types/index.js';

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  topics: z.string().optional(),           // comma-separated
  maxResults: z.coerce.number().min(1).max(50).default(10),
  minImportance: z.coerce.number().min(1).max(10).default(1),
  publishedAfter: z.string().datetime().optional(),
});

// ─── GET /api/v1/articles/search ─────────────────────────────────────────────

export async function searchArticles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid query parameters', code: 'VALIDATION_ERROR' });
      return;
    }

    const { q, topics, maxResults, minImportance, publishedAfter } = parsed.data;

    const result = await hybridSearch(q, {
      topics: topics ? topics.split(',').map((t) => t.trim()) : undefined,
      maxResults,
      minImportance,
      publishedAfter: publishedAfter ? new Date(publishedAfter) : undefined,
    });

    res.status(200).json({
      data: {
        articles: result.articles,
        total: result.articles.length,
        hasVectorResults: result.vectorResults.length > 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/articles/:id ─────────────────────────────────────────────────

export async function getArticle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Article ID required', code: 'VALIDATION_ERROR' });
      return;
    }

    const article = await Article.findById(id).lean();
    if (!article) {
      res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });
      return;
    }

    res.status(200).json({ data: article });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/articles (feed for authenticated user) ──────────────────────

export async function getArticlesFeed(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20)));
    const topics = req.query['topics']
      ? String(req.query['topics']).split(',').map((t) => t.trim())
      : undefined;

    const filter: Record<string, unknown> = {};
    if (topics?.length) filter['topics'] = { $in: topics };

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .sort({ importance: -1, publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('title summary source url publishedAt topics importance')
        .lean(),
      Article.countDocuments(filter),
    ]);

    res.status(200).json({
      data: articles,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
}
