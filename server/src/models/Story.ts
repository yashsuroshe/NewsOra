import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * A Story is a cluster of articles covering the same event or topic thread.
 * Multiple articles from different sources about "EU AI Act" → one Story.
 */
export interface IStory extends Document {
  headline: string;                          // Representative headline for the cluster
  articleIds: mongoose.Types.ObjectId[];     // All articles in this cluster
  topics: string[];                          // Aggregate topics from all articles
  maxImportance: number;                     // Highest importance score in cluster
  firstSeen: Date;                           // Earliest article publishedAt
  lastUpdated: Date;                         // Most recent article publishedAt
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const storySchema = new Schema<IStory>(
  {
    headline: { type: String, required: true, trim: true, maxlength: 500 },
    articleIds: [{ type: Schema.Types.ObjectId, ref: 'Article' }],
    topics: { type: [String], default: [] },
    maxImportance: { type: Number, default: 1, min: 1, max: 10 },
    firstSeen: { type: Date, required: true },
    lastUpdated: { type: Date, required: true },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

storySchema.index({ lastUpdated: -1 });
storySchema.index({ topics: 1, lastUpdated: -1 });
storySchema.index({ maxImportance: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

export const Story: Model<IStory> = mongoose.model<IStory>('Story', storySchema);
