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
          typecheck: {
            enabled: true,
            tsconfig: './tsconfig.tests.json',
            include: [
              'src/__tests__/form-props-types.test.ts',
              'src/__tests__/toast-types.test.ts',
            ],
          },
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
