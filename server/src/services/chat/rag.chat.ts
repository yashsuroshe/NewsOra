import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { config } from '../../config/index.js';
import { hybridSearch } from '../rag/search.js';
import { Message, Conversation } from '../../models/index.js';
import { logger } from '../../utils/logger.js';
import type { IMessage } from '../../models/index.js';
import type { VectorSearchResult } from '../../types/index.js';

// ─── Clients ──────────────────────────────────────────────────────────────────

const groq = new Groq({ apiKey: config.GROQ_API_KEY });
const gemini = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatStreamOptions {
  userId: string;
  conversationId: string;
  query: string;
  topics?: string[];
  onToken: (token: string) => void;
  onDone: (fullText: string, sources: VectorSearchResult[]) => void;
  onError: (err: Error) => void;
}

// ─── Context Builder ─────────────────────────────────────────────────────────

function buildSystemPrompt(chunks: VectorSearchResult[]): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.metadata.title} (${c.metadata.source})\n${c.text}`)
    .join('\n\n---\n\n');

  return `You are NewsOra, an expert news analyst AI assistant.
Answer questions using ONLY the news articles provided below.
Always cite your sources using [1], [2], etc. at the end of sentences.
If the answer is not in the provided articles, say "I don't have enough information from recent news to answer that."
Be concise, factual, and helpful.

NEWS CONTEXT:
${context}`;
}

async function getConversationHistory(
  conversationId: string,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(10) // Last 10 messages for context window management
    .lean();

  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

// ─── Groq Streaming ──────────────────────────────────────────────────────────

async function streamWithGroq(opts: ChatStreamOptions, chunks: VectorSearchResult[]): Promise<string> {
  const history = await getConversationHistory(opts.conversationId);
  const systemPrompt = buildSystemPrompt(chunks);

  const stream = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: opts.query },
    ],
    temperature: 0.3,
    max_tokens: 1000,
    stream: true,
  });

  let fullText = '';
  for await (const part of stream) {
    const token = part.choices[0]?.delta?.content ?? '';
    if (token) {
      fullText += token;
      opts.onToken(token);
    }
  }
  return fullText;
}

// ─── Gemini Streaming ─────────────────────────────────────────────────────────

async function streamWithGemini(opts: ChatStreamOptions, chunks: VectorSearchResult[]): Promise<string> {
  const history = await getConversationHistory(opts.conversationId);
  const systemPrompt = buildSystemPrompt(chunks);

  const contents = [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    { role: 'user' as const, parts: [{ text: opts.query }] },
  ];

  const response = await gemini.models.generateContentStream({
    model: 'gemini-1.5-flash',
    contents,
    config: { systemInstruction: systemPrompt, temperature: 0.3, maxOutputTokens: 1000 },
  });

  let fullText = '';
  for await (const chunk of response) {
    const token = chunk.text ?? '';
    if (token) {
      fullText += token;
      opts.onToken(token);
    }
  }
  return fullText;
}

// ─── Main Chat Function ───────────────────────────────────────────────────────

/**
 * Stream a RAG chat response.
 * 1. Retrieve relevant article chunks via hybrid search
 * 2. Stream LLM response token-by-token (Groq first, Gemini fallback)
 * 3. Save user message + assistant response to conversation history
 */
export async function streamRagChat(opts: ChatStreamOptions): Promise<void> {
  try {
    // Step 1: Retrieve relevant context
    const { vectorResults, articles } = await hybridSearch(opts.query, {
      topics: opts.topics,
      maxResults: 5,
    });

    // Use vector results for context; fall back to article summaries
    const contextChunks: VectorSearchResult[] = vectorResults.length > 0
      ? vectorResults
      : articles.map((a) => ({
          text: a.summary,
          score: 1,
          metadata: {
            articleId: a._id,
            source: a.source,
            topics: a.topics,
            publishedAt: a.publishedAt,
            url: a.url,
            title: a.title,
          },
        }));

    // Step 2: Save user message
    await Message.create({
      conversationId: opts.conversationId,
      role: 'user',
      content: opts.query,
    });

    // Update conversation timestamp
    await Conversation.findByIdAndUpdate(opts.conversationId, { updatedAt: new Date() });

    // Step 3: Stream response
    let fullText: string;
    try {
      fullText = await streamWithGroq(opts, contextChunks);
    } catch (groqErr) {
      logger.warn({ err: groqErr }, 'Groq streaming failed — trying Gemini');
      fullText = await streamWithGemini(opts, contextChunks);
    }

    // Step 4: Save assistant message with source citations
    const sources = contextChunks.map((c) => ({
      title: c.metadata.title,
      url: c.metadata.url,
      publishedAt: c.metadata.publishedAt,
      source: c.metadata.source,
    }));

    await Message.create({
      conversationId: opts.conversationId,
      role: 'assistant',
      content: fullText,
      sources,
    });

    opts.onDone(fullText, contextChunks);
  } catch (err) {
    opts.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
