import rateLimit from 'express-rate-limit';

const rateLimitResponse = (code: string, message: string) => ({
  error: message,
  code,
});

/** Strict limiter for auth endpoints — 5 req/min per IP */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: rateLimitResponse('RATE_LIMITED', 'Too many attempts. Try again in 1 minute.'),
});

/** Limiter for AI/chat endpoints — 10 req/min per user */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as typeof req & { userId?: string }).userId ?? req.ip ?? 'unknown',
  message: rateLimitResponse('RATE_LIMITED', 'Chat rate limit reached. Try again shortly.'),
});

/** Limiter for briefing generation — 3 req/min per user */
export const briefingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as typeof req & { userId?: string }).userId ?? req.ip ?? 'unknown',
  message: rateLimitResponse('RATE_LIMITED', 'Briefing generation rate limit reached.'),
});
