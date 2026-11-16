import { svelte } from '@sveltejs/vite-plugin-svelte'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [svelte({ compilerOptions: { dev: false }, emitCss: false })],
  resolve: {
    // Svelte's client runtime (its `node` build is SSR-only and cannot mount).
    conditions: ['browser'],
    // In this workspace the package resolves svelte from molecule/node_modules while
    // @dnd-kit/svelte, installed at the workspace root, resolves the root copy: two Svelte
    // runtimes, and context, effects and component identity break across them. A published
    // install has one copy. Inlining @dnd-kit/svelte lets Vite resolve its imports, and dedupe
    // gives them and the tests that same single Svelte.
    dedupe: ['svelte'],
  },
  test: {
    // svelte-package copies every test into dist/ and stages its output under .svelte-kit/.
    exclude: [...configDefaults.exclude, 'dist/**', '.svelte-kit/**'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'forks',
    server: { deps: { inline: ['svelte', /@dnd-kit\/svelte/] } },
  },
})
