import { Conversation, Message } from '../../models/index.js';
import { NotFoundError } from '../../utils/errors.js';
import mongoose from 'mongoose';

/**
 * Create a new conversation for a user.
 * Title is auto-generated from the first message later.
 */
export async function createConversation(userId: string): Promise<string> {
  const conversation = await Conversation.create({ userId, title: 'New Conversation' });
  return conversation._id.toString();
}

/**
 * Get conversation history (paginated), newest first.
 */
export async function getConversations(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{ conversations: object[]; total: number }> {
  const [conversations, total] = await Promise.all([
    Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Conversation.countDocuments({ userId }),
  ]);
  return { conversations, total };
}

/**
 * Get all messages for a conversation (oldest first for display).
 */
export async function getMessages(
  conversationId: string,
  userId: string,
): Promise<object[]> {
  // Verify conversation belongs to user
  const conversation = await Conversation.findOne({
    _id: new mongoose.Types.ObjectId(conversationId),
    userId,
  });
  if (!conversation) throw new NotFoundError('Conversation');

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .lean();

  return messages;
}

/**
 * Auto-update conversation title from first user message (truncated to 60 chars).
 */
export async function updateConversationTitle(
  conversationId: string,
  firstMessage: string,
): Promise<void> {
  const title = firstMessage.trim().slice(0, 60);
  await Conversation.findOneAndUpdate(
    { _id: conversationId, title: 'New Conversation' },
    { $set: { title } },
  );
}

/**
 * Delete a conversation and all its messages.
 */
export async function deleteConversation(
  conversationId: string,
  userId: string,
): Promise<void> {
  const conversation = await Conversation.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(conversationId),
    userId,
  });
  if (!conversation) throw new NotFoundError('Conversation');
  await Message.deleteMany({ conversationId });
}
