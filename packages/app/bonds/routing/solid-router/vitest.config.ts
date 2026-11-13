import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The tests render a real Solid Router; vite-plugin-solid compiles their JSX.
  plugins: [solid()],
  resolve: {
    // Solid's client build (its `node` build is SSR-only and cannot mount).
    conditions: ['browser'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    server: { deps: { inline: ['solid-js', '@solidjs/router'] } },
  },
})
