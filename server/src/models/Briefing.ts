import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IBriefing extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'daily' | 'weekly' | 'alert';
  content: string;                         // Markdown-formatted briefing text
  articleIds: mongoose.Types.ObjectId[];   // Articles referenced in this briefing
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const briefingSchema = new Schema<IBriefing>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['daily', 'weekly', 'alert'],
      required: true,
    },
    content: { type: String, required: true },
    articleIds: [{ type: Schema.Types.ObjectId, ref: 'Article' }],
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

briefingSchema.index({ userId: 1, createdAt: -1 });
briefingSchema.index({ userId: 1, type: 1, createdAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

export const Briefing: Model<IBriefing> = mongoose.model<IBriefing>('Briefing', briefingSchema);
