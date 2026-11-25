import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    typecheck: { enabled: true, tsconfig: './tsconfig.tests.json' },
  },
})
