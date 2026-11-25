import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.tests.json',
      include: ['src/__tests__/index.test.ts'],
    },
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
  },
})
