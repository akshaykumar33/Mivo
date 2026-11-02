import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/vitest/**/*.test.ts',
      'packages/shared/__tests__/**/*.test.ts',
    ],
    exclude: [
      '**/e2e/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/e2e/**',
        '**/tests/fixtures/**',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@server': path.resolve(import.meta.dirname, './apps/server/src'),
      '@mivo/shared': path.resolve(import.meta.dirname, './packages/shared/src'),
      '@mivo/database': path.resolve(import.meta.dirname, './packages/database/src'),
      '@': path.resolve(import.meta.dirname, './apps/web/src'),
    },
  },
});
