import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IMessageSource {
  title: string;
  url: string;
  publishedAt: Date;
  source: string;
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;                  // Plain text for user, Markdown for assistant
  sources?: IMessageSource[];       // Citations — only on assistant messages
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const messageSourceSchema = new Schema<IMessageSource>(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    publishedAt: { type: Date, required: true },
    source: { type: String, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: { type: String, required: true },
    sources: { type: [messageSourceSchema], default: undefined },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Fetch all messages in a conversation in order
messageSchema.index({ conversationId: 1, createdAt: 1 });

// ─── Model ────────────────────────────────────────────────────────────────────

export const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);
