/**
 * Text chunking utilities for RAG.
 *
 * Strategy: split on paragraph/sentence boundaries, target ~500 tokens per chunk.
 * We use a character-based approximation (1 token ≈ 4 chars) to avoid loading
 * a full tokenizer, which keeps the ingestion worker lightweight.
 */

const TARGET_CHARS = 2_000; // ≈ 500 tokens
const OVERLAP_CHARS = 200;  // ≈ 50 tokens overlap for context continuity

export interface TextChunk {
  text: string;
  index: number;
}

/**
 * Split text into overlapping chunks of ~500 tokens.
 * Prefers splitting at paragraph boundaries, falls back to sentence boundaries.
 */
export function chunkText(text: string): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  // Split into paragraphs first
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: TextChunk[] = [];
  let current = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    // If adding this paragraph exceeds target, flush current chunk
    if (current.length + para.length > TARGET_CHARS && current.length > 0) {
      chunks.push({ text: current.trim(), index: chunkIndex++ });
      // Keep last OVERLAP_CHARS of the previous chunk for continuity
      current = current.slice(-OVERLAP_CHARS) + '\n\n';
    }
    current += para + '\n\n';
  }

  // Flush final chunk
  if (current.trim().length > 0) {
    chunks.push({ text: current.trim(), index: chunkIndex });
  }

  // If text was a single huge paragraph, fall back to sentence splitting
  if (chunks.length === 1 && chunks[0]!.text.length > TARGET_CHARS * 1.5) {
    return sentenceSplit(text);
  }

  return chunks;
}

function sentenceSplit(text: string): TextChunk[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: TextChunk[] = [];
  let current = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if (current.length + sentence.length > TARGET_CHARS && current.length > 0) {
      chunks.push({ text: current.trim(), index: chunkIndex++ });
      current = current.slice(-OVERLAP_CHARS);
    }
    current += sentence + ' ';
  }

  if (current.trim().length > 0) {
    chunks.push({ text: current.trim(), index: chunkIndex });
  }

  return chunks;
}
