import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [svelte({ compilerOptions: { dev: false }, emitCss: false })],
  resolve: {
    // Svelte's client runtime (its `node` build is SSR-only and cannot mount).
    conditions: ['browser'],
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'forks',
    server: { deps: { inline: ['svelte'] } },
  },
})
