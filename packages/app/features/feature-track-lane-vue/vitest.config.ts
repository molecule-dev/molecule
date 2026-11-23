import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['@molecule/app-vue/testing/setup'],
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
  },
})
