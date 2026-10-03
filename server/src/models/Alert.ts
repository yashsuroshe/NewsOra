import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IAlert extends Document {
  userId: mongoose.Types.ObjectId;
  storyId: mongoose.Types.ObjectId;
  reason: string;                         // Why the alert was triggered
  importance: 'high' | 'critical';
  readAt?: Date;                          // null = unread
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const alertSchema = new Schema<IAlert>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    reason: { type: String, required: true, maxlength: 500 },
    importance: {
      type: String,
      enum: ['high', 'critical'],
      required: true,
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

alertSchema.index({ userId: 1, createdAt: -1 });
// Efficiently query unread alerts: readAt: null means unread
alertSchema.index({ userId: 1, readAt: 1 });

// ─── Model ────────────────────────────────────────────────────────────────────

export const Alert: Model<IAlert> = mongoose.model<IAlert>('Alert', alertSchema);
