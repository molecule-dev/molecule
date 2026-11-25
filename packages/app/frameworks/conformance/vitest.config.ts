import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['@molecule/app-vue/testing/setup'],
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'forks',
    typecheck: { enabled: true, tsconfig: './tsconfig.json' },
  },
})
