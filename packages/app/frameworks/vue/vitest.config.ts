import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.tests.json',
      include: ['src/composables/__tests__/useOptimisticToggle.test.ts'],
    },
    setupFiles: ['./src/testing/setup.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
  },
})
