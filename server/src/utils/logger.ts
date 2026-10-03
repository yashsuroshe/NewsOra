import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport:
    config.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  // Scrub sensitive fields from logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.refreshToken',
      '*.refreshTokenHash',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
});
