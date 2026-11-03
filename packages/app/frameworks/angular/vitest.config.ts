import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Tests render real Angular components: oxc (vitest 4's transformer) must
  // compile their legacy decorators, matching tsconfig.json's
  // `experimentalDecorators` (oxc does not discover the tsconfig on its own,
  // and a decorator left in the output is a syntax error to the runner).
  oxc: {
    decorator: { legacy: true },
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
  },
})
