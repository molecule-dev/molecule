import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    fileParallelism: false,
    pool: 'forks',
  },
})
