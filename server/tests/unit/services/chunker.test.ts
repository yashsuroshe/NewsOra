import { describe, it, expect } from 'vitest';
import { chunkText } from '../../../src/services/rag/chunker.js';

describe('chunkText', () => {
  it('UT-CHUNK-01: returns empty array for empty text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('UT-CHUNK-02: single short text returns one chunk', () => {
    const text = 'This is a short article about AI.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.index).toBe(0);
    expect(chunks[0]!.text).toContain('AI');
  });

  it('UT-CHUNK-03: long text is split into multiple chunks', () => {
    // Create text > 2000 chars with clear paragraph breaks
    const paragraph = 'Lorem ipsum dolor sit amet. '.repeat(30); // ~840 chars
    const text = [paragraph, paragraph, paragraph, paragraph].join('\n\n');

    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('UT-CHUNK-04: chunks have sequential indexes', () => {
    const paragraph = 'A '.repeat(600); // 1200 chars per paragraph
    const text = [paragraph, paragraph, paragraph].join('\n\n');

    const chunks = chunkText(text);
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });

  it('UT-CHUNK-05: each chunk stays within expected size bounds', () => {
    const paragraph = 'Word '.repeat(500); // 2500 chars per paragraph
    const text = [paragraph, paragraph].join('\n\n');

    const chunks = chunkText(text);
    // Max chunk = TARGET_CHARS (2000) + OVERLAP (200) + one paragraph overhead
    // In the worst case a paragraph > TARGET_CHARS is flushed as-is with overlap
    chunks.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThan(3_000);
    });
  });
});
