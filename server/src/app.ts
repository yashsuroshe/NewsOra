import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import rateLimit from 'express-rate-limit';
import passport from 'passport';

import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { getRedisClient } from './config/redis.js';
import { logger } from './utils/logger.js';
import { configurePassport } from './config/passport.js';
import { requestId } from './middleware/requestId.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import routes from './routes/index.js';

// Configure Passport strategies at module load time
configurePassport();


// ─── Create Express App ───────────────────────────────────────────────────────

export function createApp(): express.Application {
  const app = express();

  // ── Security Headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'https:'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  // ── Body Parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(compression());
  app.use(passport.initialize()); // No sessions — stateless JWT architecture

  // ── Request ID + Logging ──────────────────────────────────────────────────
  app.use(requestId);
  app.use(pinoHttp({ logger }));

  // ── Global Rate Limit ─────────────────────────────────────────────────────
  app.use(
    '/api/',
    rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests', code: 'RATE_LIMITED' },
    }),
  );

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/v1', routes);

  // ── 404 Handler ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
  });

  // ── Global Error Handler ──────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // Connect to dependencies first
  await connectDatabase();
  getRedisClient(); // initialise connection

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 API Server running on port ${config.PORT} [${config.NODE_ENV}]`);
  });

  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Only run bootstrap when this file is the entry point (not in tests)
if (process.argv[1]?.endsWith('app.ts') || process.argv[1]?.endsWith('app.js')) {
  bootstrap().catch((err: unknown) => {
    logger.error({ err }, 'Bootstrap failed');
    process.exit(1);
  });
}
