import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    // Re-publish the DOM's Web Storage as the global localStorage/sessionStorage
    // — see the setup file for why Node 25+ needs it.
    setupFiles: ['./src/__tests__/setup.ts'],
    // The custom-profile-shape probes each spin a full TypeScript program
    // over the bond graph; on this shared VM (many parallel agent sessions,
    // load averages in the tens) a probe can exceed vitest's 5s default —
    // the suite's own heaviest cases already carry 30_000. This is headroom
    // for machine load, not for slower code.
    testTimeout: 60_000,
  },
})
