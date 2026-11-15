import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The tests compile Solid JSX the same way a consumer's build does.
  plugins: [solid()],
  resolve: {
    // Solid's client build (its `node` build is SSR-only and cannot mount).
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
  },
})
