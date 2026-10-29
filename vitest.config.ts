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
  },
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, './apps/server/src'),
      '@mivo/shared': path.resolve(__dirname, './packages/shared/src'),
      '@mivo/database': path.resolve(__dirname, './packages/database/src'),
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
});
