import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['@molecule/app-vue/testing/setup'],
    environment: 'jsdom',
  },
})
