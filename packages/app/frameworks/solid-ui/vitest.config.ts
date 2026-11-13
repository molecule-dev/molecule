import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The package preserves JSX for vite-plugin-solid consumers. Tests render it
  // through Solid's supported hyperscript runtime (as @molecule/app-solid's do).
  oxc: {
    jsx: {
      runtime: 'automatic',
      development: false,
      importSource: 'solid-js/h',
    },
  },
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
