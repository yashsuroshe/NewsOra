import type { Request } from 'express';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;      // userId
  email: string;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  userId: string;
  userEmail: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  cursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

// ─── Ingestion ────────────────────────────────────────────────────────────────

export interface RawArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  snippet?: string;
}

export interface EnrichedArticle extends RawArticle {
  summary: string;
  topics: string[];
  importance: number;
  entities: string[];
  content?: string;
}

// ─── RAG ─────────────────────────────────────────────────────────────────────

export interface VectorChunkMetadata {
  articleId: string;
  source: string;
  topics: string[];
  publishedAt: Date;
  url: string;
  title: string;
}

export interface VectorSearchResult {
  text: string;
  score: number;
  metadata: VectorChunkMetadata;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

// ─── Agents ───────────────────────────────────────────────────────────────────

export interface ScoredStory {
  storyId: string;
  headline: string;
  articles: EnrichedArticle[];
  relevanceScore: number;
  maxImportance: number;
}

export interface ImpactResult {
  storyId: string;
  analysis: string;
}

export interface AlertTrigger {
  userId: string;
  storyId: string;
  reason: string;
  importance: 'high' | 'critical';
}

export interface AgentError {
  node: string;
  error: string;
  timestamp: Date;
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface NewBriefingEvent {
  briefingId: string;
  type: 'daily' | 'weekly';
  createdAt: Date;
}

export interface NewAlertEvent {
  alertId: string;
  storyHeadline: string;
  importance: 'high' | 'critical';
  reason: string;
}
