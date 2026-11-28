import { fileURLToPath } from 'node:url'

import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The kit's components import the elements by the package's own name, so the
      // `react-native` condition can swap them; its tests read them from source.
      '@molecule/app-ui-react/elements': fileURLToPath(
        new URL('./src/elements/index.ts', import.meta.url),
      ),
      '@molecule/app-ui-react/platform': fileURLToPath(
        new URL('./src/platform/index.tsx', import.meta.url),
      ),
    },
  },
  test: {
    server: { deps: { inline: ['@molecule/app-react-ui-kit-components'] } },
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    typecheck: {
      enabled: true,
      // The source tests use the installed React types. The peer-floor check has its own scope.
      tsconfig: './tsconfig.vitest.json',
      include: [
        ...configDefaults.typecheck.include,
        'src/__tests__/web-*.types.tsx',
        'src/elements/__tests__/{DirectAttributes,Svg}.test.tsx',
        'src/__tests__/responsive-app-shell.test.tsx',
      ],
    },
    projects: [
      { extends: true, test: { name: 'react-ui' } },
      {
        root: fileURLToPath(new URL('.', import.meta.url)),
        test: {
          name: 'react-ui-native-types',
          typecheck: {
            enabled: true,
            only: true,
            tsconfig: './tsconfig.tests.native.json',
            include: ['src/__tests__/native-*.types.tsx'],
          },
        },
      },
    ],
  },
})
