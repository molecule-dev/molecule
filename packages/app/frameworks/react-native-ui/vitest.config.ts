import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const reactUiNativeEntry = (file: string): string =>
  fileURLToPath(new URL(`../react-ui/src/${file}`, import.meta.url))

export default defineConfig({
  // Follow the native entry points without activating native exports in Vitest's own dependencies.
  resolve: {
    alias: [
      // Test imports use local source; the forwarded elements must share those same contexts.
      {
        find: /^@molecule\/app-ui-react-native\/elements$/,
        replacement: fileURLToPath(new URL('./src/elements/index.ts', import.meta.url)),
      },
      {
        find: /^@molecule\/app-ui-react-native\/platform$/,
        replacement: fileURLToPath(new URL('./src/platform/index.tsx', import.meta.url)),
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
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    typecheck: { enabled: true, tsconfig: './tsconfig.tests.json' },
  },
})
