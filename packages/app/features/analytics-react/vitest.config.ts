import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // AnalyticsRouteListener is effect-only — needs a real DOM to mount and
    // fire its `useEffect`, so this package uses jsdom rather than node SSR.
    environment: 'jsdom',
  },
})
