import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The binding conformance host is a real `.svelte` component.
  plugins: [svelte({ compilerOptions: { dev: false }, emitCss: false })],
  resolve: {
    // Svelte's client runtime (its `node` build is SSR-only and cannot mount).
    conditions: ['browser'],
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    server: { deps: { inline: ['svelte'] } },
  },
})
