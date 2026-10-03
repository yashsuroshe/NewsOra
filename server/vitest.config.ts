import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Inject test env vars BEFORE any module is imported — prevents
    // config/index.ts from calling process.exit(1) during tests.
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017/newsora-test',
      REDIS_URL: 'redis://localhost:6379',
      // Must be ≥32 chars (Zod min constraint)
      JWT_SECRET: 'test-jwt-secret-must-be-at-least-32-chars!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-must-be-at-least-32-chars!!',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
      GROQ_API_KEY: 'gsk_test_placeholder',
      GEMINI_API_KEY: 'AIza_test_placeholder',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/app.ts', 'src/workers/**', 'src/types/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
    testTimeout: 15000,
  },
});
