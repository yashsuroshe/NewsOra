import { createHash, randomBytes } from 'crypto';

/**
 * SHA-256 hash of a string.
 * Used for: URL deduplication, refresh token storage.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a cryptographically random token string.
 * Used for: refresh tokens.
 */
export function generateToken(bytes = 48): string {
  return randomBytes(bytes).toString('hex');
}
