import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The package ships preserved JSX for consumers that compile it with
  // vite-plugin-solid; the tests compile it the same way.
  plugins: [solid()],
  resolve: {
    // Solid's client build (its `node` build is SSR-only and cannot mount).
    conditions: ['browser'],
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'forks',
    server: { deps: { inline: ['solid-js'] } },
  },
})
