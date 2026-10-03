import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type { RawArticle, EnrichedArticle } from '../../types/index.js';
import { PREDEFINED_TOPICS } from '../../config/feeds.js';

// ─── Clients ──────────────────────────────────────────────────────────────────

const groq = new Groq({ apiKey: config.GROQ_API_KEY });
const gemini = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

interface LlmEnrichment {
  summary: string;
  topics: string[];
  importance: number;
  entities: string[];
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(article: RawArticle, content: string): string {
  const textForAnalysis = content || article.snippet || article.title;
  const topicList = PREDEFINED_TOPICS.join(', ');

  return `You are a news analyst. Analyze this article and respond ONLY with valid JSON matching the schema below. No explanation, no markdown fences.

Article title: ${article.title}
Source: ${article.source}
Text: ${textForAnalysis.slice(0, 2000)}

Schema:
{
  "summary": "<2-3 sentence summary in plain English>",
  "topics": ["<topic from list>"],
  "importance": <integer 1-10 where 10=global breaking news>,
  "entities": ["<person/org/place/product names>"]
}

Available topics (pick 1-3 that apply): ${topicList}
Rules:
- summary: max 250 characters
- topics: only from the provided list, 1-3 items
- importance: 1=routine news, 5=notable, 8+=major event, 10=historic
- entities: max 5 named entities`;
}

// ─── LLM Calls ───────────────────────────────────────────────────────────────

async function enrichWithGroq(prompt: string): Promise<LlmEnrichment> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant', // 14,400 RPD on free tier
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 300,
  });

  const text = completion.choices[0]?.message?.content ?? '';
  return parseEnrichmentJson(text);
}

async function enrichWithGemini(prompt: string): Promise<LlmEnrichment> {
  const result = await gemini.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0.1, maxOutputTokens: 300 },
  });

  const text = result.text ?? '';
  return parseEnrichmentJson(text);
}

function parseEnrichmentJson(text: string): LlmEnrichment {
  // Extract JSON block even if model adds surrounding text
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) throw new Error('No JSON found in LLM response');

  const parsed = JSON.parse(match[0]) as Partial<LlmEnrichment>;

  return {
    summary: String(parsed.summary ?? '').slice(0, 250),
    topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 3) : [],
    importance: Math.min(10, Math.max(1, Number(parsed.importance ?? 5))),
    entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 5) : [],
  };
}

// ─── Main Enrichment Function ─────────────────────────────────────────────────

/**
 * Enrich a raw article with LLM-generated summary, topics, importance, and entities.
 * Tries Groq first (faster, higher free quota), falls back to Gemini.
 * Returns a best-effort result on total failure — never throws.
 */
export async function enrichArticle(
  article: RawArticle,
  content: string,
): Promise<EnrichedArticle> {
  const prompt = buildPrompt(article, content);
  let enrichment: LlmEnrichment;

  try {
    enrichment = await enrichWithGroq(prompt);
  } catch (groqErr) {
    logger.warn({ url: article.url, err: groqErr }, 'Groq enrichment failed — trying Gemini');
    try {
      enrichment = await enrichWithGemini(prompt);
    } catch (geminiErr) {
      logger.error({ url: article.url, err: geminiErr }, 'Both LLMs failed — using defaults');
      enrichment = {
        summary: article.snippet?.slice(0, 250) ?? article.title,
        topics: [],
        importance: 5,
        entities: [],
      };
    }
  }

  return {
    ...article,
    content,
    summary: enrichment.summary,
    topics: enrichment.topics,
    importance: enrichment.importance,
    entities: enrichment.entities,
  };
}
