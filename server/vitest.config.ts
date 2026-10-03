import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
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
