import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;     // Auto-generated from first user message (truncated to 60 chars)
  createdAt: Date;
  updatedAt: Date;   // Automatically updated when new message added
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const conversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Conversation', maxlength: 100, trim: true },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

conversationSchema.index({ userId: 1, updatedAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

export const Conversation: Model<IConversation> = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema,
);
