import { defineConfig } from 'vitest/config'

export default defineConfig({
  // In this workspace the package resolves react from molecule/node_modules while @dnd-kit/react,
  // installed at the workspace root, resolves the root copy: two Reacts, and every hook throws. A
  // published install has one copy. Inlining @dnd-kit/react lets Vite resolve its imports, and
  // dedupe gives them and the tests that same single React.
  resolve: { dedupe: ['react', 'react-dom'] },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    server: { deps: { inline: [/@dnd-kit\/react/] } },
  },
})
