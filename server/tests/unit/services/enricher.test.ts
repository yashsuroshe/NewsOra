import { describe, it, expect, vi } from 'vitest';
import { enrichArticle } from '../../../src/services/ingestion/enricher.js';
import type { RawArticle } from '../../../src/types/index.js';

// Mock both LLM clients
vi.mock('groq-sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                summary: 'AI models are improving rapidly in 2025.',
                topics: ['AI'],
                importance: 7,
                entities: ['OpenAI', 'Google'],
              }),
            },
          }],
        }),
      },
    },
  })),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          summary: 'Fallback summary.',
          topics: ['Tech'],
          importance: 5,
          entities: [],
        }),
      }),
      embedContent: vi.fn().mockResolvedValue({
        embeddings: [{ values: new Array(768).fill(0.1) }],
      }),
    },
  })),
}));

const SAMPLE_ARTICLE: RawArticle = {
  title: 'New AI Models Outperform Humans on Reasoning Tasks',
  url: 'https://techcrunch.com/ai-models-2025',
  source: 'TechCrunch',
  publishedAt: new Date('2025-06-01'),
  snippet: 'Researchers at leading AI labs...',
};

describe('enrichArticle', () => {
  it('UT-ENRICH-01: enriches article with LLM-generated fields', async () => {
    const enriched = await enrichArticle(SAMPLE_ARTICLE, 'Full article text here...');

    expect(enriched.summary).toBeTruthy();
    expect(enriched.summary.length).toBeLessThanOrEqual(250);
    expect(Array.isArray(enriched.topics)).toBe(true);
    expect(enriched.importance).toBeGreaterThanOrEqual(1);
    expect(enriched.importance).toBeLessThanOrEqual(10);
    expect(Array.isArray(enriched.entities)).toBe(true);
  });

  it('UT-ENRICH-02: preserves original article fields', async () => {
    const enriched = await enrichArticle(SAMPLE_ARTICLE, '');

    expect(enriched.title).toBe(SAMPLE_ARTICLE.title);
    expect(enriched.url).toBe(SAMPLE_ARTICLE.url);
    expect(enriched.source).toBe(SAMPLE_ARTICLE.source);
    expect(enriched.publishedAt).toEqual(SAMPLE_ARTICLE.publishedAt);
  });

  it('UT-ENRICH-03: uses Groq output (mocked) correctly', async () => {
    const enriched = await enrichArticle(SAMPLE_ARTICLE, 'content');

    expect(enriched.summary).toBe('AI models are improving rapidly in 2025.');
    expect(enriched.topics).toContain('AI');
    expect(enriched.importance).toBe(7);
    expect(enriched.entities).toContain('OpenAI');
  });
});
