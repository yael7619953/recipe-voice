import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // mongodb-memory-server may download a binary on first run.
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
