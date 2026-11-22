import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Most cases lint with type information, so each one builds a TypeScript program: the
    // slowest took 3.5 s of the default 5 s locally on 2026-11-22. The limit is sized to that
    // work, as for the other packages whose tests build a program.
    testTimeout: 20_000,
  },
})
