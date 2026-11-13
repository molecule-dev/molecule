import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Many tests here start real processes (node, unzip, Playwright and its browser) beside the
    // rest of the suite's. Vitest's 5 s default failed whichever of them a loaded machine slowed
    // past it (a trace read took 12 s at load 21). A test that asserts timing still asserts it.
    testTimeout: 30_000,
  },
})
