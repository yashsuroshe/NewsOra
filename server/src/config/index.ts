import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z
    .string()
    .default('http://localhost:3001/api/v1/auth/google/callback'),

  // AI Providers
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  OPENROUTER_API_KEY: z.string().optional(),

  // News APIs
  GNEWS_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Ingestion
  INGESTION_INTERVAL_MINUTES: z.coerce.number().default(15),
  MAX_ARTICLES_PER_CYCLE: z.coerce.number().default(50),
  ARTICLE_TTL_DAYS: z.coerce.number().default(30),

  // Vector DB
  VECTOR_DB_PROVIDER: z.enum(['atlas', 'qdrant']).default('atlas'),
  QDRANT_URL: z.string().optional(),
  QDRANT_API_KEY: z.string().optional(),

  // Feature Flags
  ENABLE_SOCKET_IO: z.coerce.boolean().default(true),
  ENABLE_ALERTS: z.coerce.boolean().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  parsed.error.errors.forEach((err) => {
    console.error(`  ${err.path.join('.')}: ${err.message}`);
  });
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
