import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The package preserves JSX for vite-plugin-solid consumers. Tests use Solid's
  // supported hyperscript runtime, which preserves lazy component children too.
  oxc: {
    jsx: {
      runtime: 'automatic',
      development: false,
      importSource: 'solid-js/h',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    // Let the browser integration's mocks select one shared reactive runtime,
    // including the hyperscript runtime and DOM renderer's transitive imports.
    server: { deps: { inline: ['solid-js'] } },
  },
})
