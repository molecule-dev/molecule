import solid from 'vite-plugin-solid'
import { configDefaults, defineConfig, type TestUserConfig } from 'vitest/config'

const ssr = 'src/__tests__/overlay-ssr.test.tsx'
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
        // Test preserved JSX with the same compiler the kit's consumers use.
        plugins: [solid()],
        resolve: { conditions: ['browser'] },
        test: {
          ...settings,
          name: 'app-ui-solid',
          exclude: [...configDefaults.exclude, ssr],
          server: { deps: { inline: ['solid-js'] } },
        },
      },
      {
        plugins: [solid({ ssr: true })],
        resolve: { conditions: ['node'] },
        test: { ...settings, name: 'app-ui-solid-ssr', include: [ssr] },
      },
    ],
  },
})
