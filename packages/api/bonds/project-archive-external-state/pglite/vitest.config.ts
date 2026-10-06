import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // PGlite boots Postgres from WebAssembly: a cold start takes seconds on a CI runner, so the
    // 5-second default times tests out there while they pass locally.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
