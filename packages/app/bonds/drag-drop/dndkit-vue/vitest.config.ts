import { defineConfig } from 'vitest/config'

export default defineConfig({
  // In this workspace the package resolves vue from molecule/node_modules while @dnd-kit/vue,
  // installed at the workspace root, resolves the root copy: two Vues, and the composables read
  // a different injection context than the one the test renders into. A published install has
  // one copy. Inlining @dnd-kit/vue lets Vite resolve its imports, and dedupe gives them and the
  // tests that same single Vue.
  resolve: { dedupe: ['vue'] },
  test: {
    setupFiles: ['@molecule/app-vue/testing/setup'],
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    server: { deps: { inline: [/@dnd-kit\/vue/] } },
  },
})
