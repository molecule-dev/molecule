import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The kit's components import the elements by the package's own name, so the
      // `react-native` condition can swap them; its tests read them from source.
      '@molecule/app-ui-react/elements': fileURLToPath(
        new URL('./src/elements/index.ts', import.meta.url),
      ),
    },
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
