import { fileURLToPath } from 'node:url'

import { configDefaults, defineConfig } from 'vitest/config'

const reactUiNativeEntry = (file: string): string =>
  fileURLToPath(new URL(`../../frameworks/react-ui/src/${file}`, import.meta.url))
const nativeUiEntry = (file: string): string =>
  fileURLToPath(new URL(`../../frameworks/react-native-ui/src/${file}`, import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          name: 'web',
          exclude: [...configDefaults.exclude, 'src/__tests__/native.test.tsx'],
        },
      },
      {
        extends: true,
        resolve: {
          alias: [
            {
              find: /^@molecule\/app-ui-react-native\/elements$/,
              replacement: nativeUiEntry('elements/index.ts'),
            },
            {
              find: /^@molecule\/app-ui-react-native\/platform$/,
              replacement: nativeUiEntry('platform/index.tsx'),
            },
            {
              find: /^@molecule\/app-ui-react$/,
              replacement: reactUiNativeEntry('index.native.ts'),
            },
            {
              find: /^@molecule\/app-ui-react\/elements$/,
              replacement: reactUiNativeEntry('elements/native.ts'),
            },
            {
              find: /^@molecule\/app-ui-react\/platform$/,
              replacement: reactUiNativeEntry('platform/native.ts'),
            },
          ],
        },
        test: { name: 'native', include: ['src/__tests__/native.test.tsx'] },
      },
    ],
  },
})
