import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // A ChatPanel test mounts and drives the whole panel: 2–4 s on an idle machine, and
    // over the 5 s default when other test runs share the machine (a release's pre-push
    // run included). Time is not what these tests assert.
    testTimeout: 30_000,
  },
})
