import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    // List every test file (and so the conformance suite's file by name), even on an all-green run.
    reporters: ['verbose'],
  },
})
