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
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    // Let the browser integration's mocks select one shared reactive runtime,
    // including the DOM renderer's transitive imports.
    server: { deps: { inline: ['solid-js'] } },
  },
})
