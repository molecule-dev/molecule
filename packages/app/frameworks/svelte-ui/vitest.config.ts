import { svelte } from '@sveltejs/vite-plugin-svelte'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [svelte({ compilerOptions: { dev: false }, emitCss: false })],
  resolve: {
    // Svelte's client runtime (its `node` build is SSR-only and cannot mount).
    conditions: ['browser'],
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
    server: { deps: { inline: ['svelte'] } },
  },
})
