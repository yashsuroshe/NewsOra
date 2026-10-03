import type { Request, Response, NextFunction } from 'express';
import { streamRagChat } from '../services/chat/rag.chat.js';
import * as conversationService from '../services/chat/conversation.service.js';
import type { AuthRequest } from '../types/index.js';

// ─── POST /api/v1/chat/conversations ─────────────────────────────────────────

export async function createConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const conversationId = await conversationService.createConversation(userId);
    res.status(201).json({ data: { conversationId } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/chat/conversations ──────────────────────────────────────────

export async function getConversations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20)));
    const result = await conversationService.getConversations(userId, page, limit);
    res.status(200).json({ data: result.conversations, meta: { total: result.total, page, limit } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/chat/conversations/:id/messages ─────────────────────────────

export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const conversationId = req.params['id'] ?? '';
    const messages = await conversationService.getMessages(conversationId, userId);
    res.status(200).json({ data: messages });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/chat/conversations/:id ────────────────────────────────────

export async function deleteConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId;
    const conversationId = req.params['id'] ?? '';
    await conversationService.deleteConversation(conversationId, userId);
    res.status(200).json({ data: { message: 'Conversation deleted' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/chat/conversations/:id/stream ───────────────────────────────

/**
 * SSE streaming endpoint for RAG chat.
 * Sends tokens as server-sent events and a final [DONE] marker.
 *
 * SSE event format:
 *   data: {"type":"token","content":"..."}
 *   data: {"type":"done","sources":[...]}
 *   data: {"type":"error","message":"..."}
 */
export async function streamChat(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = (req as AuthRequest).userId;
  const conversationId = req.params['id'] ?? '';
  const body = req.body as { query?: string; topics?: string[] };

  if (!body.query?.trim()) {
    res.status(400).json({ error: 'query is required', code: 'VALIDATION_ERROR' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 20_000);

  const cleanup = (): void => {
    clearInterval(heartbeat);
  };

  req.on('close', cleanup);

  await streamRagChat({
    userId,
    conversationId,
    query: body.query.trim(),
    topics: body.topics,
    onToken: (token) => {
      res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
    },
    onDone: (_, sources) => {
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          sources: sources.map((s) => ({
            title: s.metadata.title,
            url: s.metadata.url,
            source: s.metadata.source,
          })),
        })}\n\n`,
      );
      cleanup();
      res.end();
    },
    onError: (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      cleanup();
      res.end();
    },
  });
}
