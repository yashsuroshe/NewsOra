import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IArticle extends Document {
  urlHash: string;          // SHA-256 of canonical URL — deduplication key
  title: string;
  content?: string;         // Full extracted text (may be empty for paywalled articles)
  summary: string;          // LLM-generated 2-3 sentence summary
  source: string;           // Publisher name (e.g., "TechCrunch")
  url: string;              // Original article URL
  publishedAt: Date;
  topics: string[];         // LLM-assigned topic categories
  importance: number;       // LLM-assigned 1-10 importance score
  entities: string[];       // Named entities extracted by LLM
  storyId?: mongoose.Types.ObjectId; // FK to Story cluster (null until clustered)
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const articleSchema = new Schema<IArticle>(
  {
    urlHash: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 500 },
    content: { type: String, default: '' },
    summary: { type: String, default: '', maxlength: 1000 },
    source: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    publishedAt: { type: Date, required: true },
    topics: { type: [String], default: [] },
    importance: { type: Number, default: 5, min: 1, max: 10 },
    entities: { type: [String], default: [] },
    storyId: { type: Schema.Types.ObjectId, ref: 'Story', default: null },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

articleSchema.index({ urlHash: 1 }, { unique: true });
articleSchema.index({ topics: 1, publishedAt: -1 });
articleSchema.index({ storyId: 1 });
articleSchema.index({ importance: -1, publishedAt: -1 });
// TTL: auto-delete articles older than ARTICLE_TTL_DAYS (default 30 days)
articleSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

// ─── Model ────────────────────────────────────────────────────────────────────

export const Article: Model<IArticle> = mongoose.model<IArticle>('Article', articleSchema);
