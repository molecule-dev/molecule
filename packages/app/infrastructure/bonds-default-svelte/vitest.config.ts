import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The tests compile their Svelte components the same way a consumer's build does.
  plugins: [svelte({ compilerOptions: { dev: false }, emitCss: false })],
  resolve: {
    // Svelte's client runtime (its `node` build is SSR-only and cannot mount).
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
  },
})
