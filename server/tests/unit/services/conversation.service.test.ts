import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as conversationService from '../../../src/services/chat/conversation.service.js';
import * as authService from '../../../src/services/auth.service.js';

describe('conversation.service', () => {
  let userId: string;

  beforeEach(async () => {
    const { user } = await authService.register({
      name: 'Chat User',
      email: `chat${Date.now()}@example.com`,
      password: 'Password123',
    });
    userId = user.id as string;
  });

  it('UT-CONV-01: creates a new conversation', async () => {
    const conversationId = await conversationService.createConversation(userId);
    expect(conversationId).toBeTruthy();
    expect(typeof conversationId).toBe('string');
  });

  it('UT-CONV-02: lists conversations for a user', async () => {
    await conversationService.createConversation(userId);
    await conversationService.createConversation(userId);

    const result = await conversationService.getConversations(userId);
    expect(result.total).toBe(2);
    expect(result.conversations).toHaveLength(2);
  });

  it('UT-CONV-03: deletes a conversation', async () => {
    const conversationId = await conversationService.createConversation(userId);
    await conversationService.deleteConversation(conversationId, userId);

    const result = await conversationService.getConversations(userId);
    expect(result.total).toBe(0);
  });

  it('UT-CONV-04: getMessages throws NotFoundError for wrong userId', async () => {
    const conversationId = await conversationService.createConversation(userId);
    await expect(
      conversationService.getMessages(conversationId, 'wrong-user-id'),
    ).rejects.toThrow();
  });
});
