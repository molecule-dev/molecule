import { svelte } from '@sveltejs/vite-plugin-svelte'
import { configDefaults, defineConfig, type TestUserConfig } from 'vitest/config'

const ssr = 'src/__tests__/overlay-ssr.test.ts'
const settings = {
  globals: true,
  environment: 'node',
  testTimeout: 30000,
  hookTimeout: 30000,
  fileParallelism: false,
  pool: 'forks',
} satisfies TestUserConfig

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [svelte({ compilerOptions: { dev: false }, emitCss: false })],
        resolve: { conditions: ['browser'] },
        test: {
          ...settings,
          name: 'app-ui-svelte',
          // svelte-package stages copies of tests under these directories.
          exclude: [...configDefaults.exclude, 'dist/**', '.svelte-kit/**', ssr],
          server: { deps: { inline: ['svelte'] } },
        },
      },
      {
        plugins: [svelte({ compilerOptions: { dev: false }, emitCss: false })],
        resolve: { conditions: ['node'] },
        test: { ...settings, name: 'app-ui-svelte-ssr', include: [ssr] },
      },
    ],
  },
})
