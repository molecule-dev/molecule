import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // PGlite boots Postgres from WebAssembly: a cold start takes seconds on a CI runner, so the
    // 5-second default times tests out there while they pass locally.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/*.d.ts'],
    },
  },
})
