import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The package ships preserved JSX for consumers that compile it with
  // vite-plugin-solid; the tests compile it the same way.
  plugins: [solid()],
  resolve: {
    // In this workspace the package resolves solid-js from molecule/node_modules while
    // @dnd-kit/solid, installed at the workspace root, resolves the root copy: two Solids, and
    // the list's reactive owner breaks. A published install has one copy. Inlining @dnd-kit/solid
    // lets Vite resolve its imports, and dedupe gives them and the tests that same single Solid.
    dedupe: ['solid-js'],
    // Solid's client build (its `node` build is SSR-only and cannot mount).
    conditions: ['browser'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'forks',
    server: { deps: { inline: ['solid-js', /@dnd-kit\/solid/] } },
  },
})
