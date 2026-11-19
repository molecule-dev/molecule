import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig, type TestProjectInlineConfiguration } from 'vitest/config'

/** The SvelteKit app the tests run in: a kit project of its own (`src/__tests__/kit-app`). */
const app = fileURLToPath(new URL('./src/__tests__/kit-app', import.meta.url))

/** Where the tests are: outside the app, which is each project's root. */
const tests = fileURLToPath(new URL('./src/__tests__', import.meta.url))

/**
 * A test project that runs the tests in the test app, built by kit's own Vite plugin with
 * `options`: kit compiles its base path and router type into its client, so each
 * configuration is its own project.
 *
 * @param name - The configuration's name, also its output directory.
 * @param options - Kit's `paths` and `router` options.
 * @param base - The base path the cases run under.
 * @returns The project.
 */
const kitProject = (
  name: string,
  options: { paths?: { base: '/app' }; router?: { type: 'hash' } },
  base: '' | '/app',
): TestProjectInlineConfiguration => ({
  // The app's own directory is the root, as a kit app's is: kit reads its `src` there and
  // checks the app's `tsconfig.json`, and writes its generated types beside it.
  root: app,
  plugins: [sveltekit({ outDir: `.svelte-kit/${name}`, ...options })],
  // The app runs in the browser (jsdom): kit's and Svelte's browser builds, as a page loads them.
  resolve: { conditions: ['browser', 'development'] },
  test: {
    name: `kit-${name}`,
    environment: 'jsdom',
    dir: tests,
    include: ['*.test.ts'],
    // Each case boots the kit app and then moves through real history: about 1-2 s alone, but
    // a busy machine slowed one past 10 s (2026-11-19, load 33 on 14 cores) while it
    // passed 32 of 32 runs alone. 30 s still fails a navigation that never completes.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Each project runs whole wherever it is listed: the monorepo's grouped runner runs these
    // projects in place of this file (scripts/vitest-grouped.mjs), so nothing is set outside them.
    fileParallelism: false,
    pool: 'forks',
    provide: {
      kitOutDir: join(app, '.svelte-kit', name),
      kitBase: base,
      kitHash: options.router?.type === 'hash',
    },
  },
})

export default defineConfig({
  test: {
    projects: [
      kitProject('root', {}, ''),
      kitProject('base', { paths: { base: '/app' } }, '/app'),
      kitProject('hash', { router: { type: 'hash' } }, ''),
    ],
  },
})
