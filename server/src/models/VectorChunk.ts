import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IVectorChunkMetadata {
  source: string;
  topics: string[];
  publishedAt: Date;
  url: string;
  title: string;
}

export interface IVectorChunk extends Document {
  articleId: mongoose.Types.ObjectId;
  chunkIndex: number;           // Position of this chunk within the article
  text: string;                 // Raw chunk text (~500 tokens)
  embedding: number[];          // 768-dimensional Gemini embedding
  metadata: IVectorChunkMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const vectorChunkSchema = new Schema<IVectorChunk>(
  {
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    chunkIndex: { type: Number, required: true, min: 0 },
    text: { type: String, required: true },
    // Store embedding as array of numbers (768 dimensions for gemini-embedding-001)
    // The Atlas Vector Search index is created separately via the CLI/Atlas UI
    embedding: { type: [Number], required: true },
    metadata: {
      source: { type: String, required: true },
      topics: { type: [String], default: [] },
      publishedAt: { type: Date, required: true },
      url: { type: String, required: true },
      title: { type: String, required: true },
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Look up all chunks for a given article (e.g., for deletion)
vectorChunkSchema.index({ articleId: 1, chunkIndex: 1 });
// Filter by topic during vector search pre-filtering
vectorChunkSchema.index({ 'metadata.topics': 1 });
// Filter by date during vector search pre-filtering
vectorChunkSchema.index({ 'metadata.publishedAt': -1 });

// NOTE: The vector search index on `embedding` (HNSW, 768 dims, cosine)
// must be created via MongoDB Atlas UI or mongosh — Mongoose does NOT
// support creating vector search indexes programmatically.
// Run: scripts/create-vector-index.ts

// ─── Model ────────────────────────────────────────────────────────────────────

export const VectorChunk: Model<IVectorChunk> = mongoose.model<IVectorChunk>(
  'VectorChunk',
  vectorChunkSchema,
);
