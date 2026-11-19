/**
 * The test app as a SvelteKit project of its own: the config `svelte-kit sync` reads to
 * generate the app's types (`$app/types`, `$app/tsconfig`) for `npm run typecheck:tests`.
 * The tests build the same app once per kit configuration (`../../../vitest.config.ts`).
 *
 * @module
 */

import { fileURLToPath } from 'node:url'

import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [sveltekit()],
})
