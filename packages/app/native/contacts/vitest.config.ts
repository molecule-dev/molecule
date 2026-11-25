import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.tests.json',
      include: ['src/__tests__/index.test.ts'],
    },
    globals: true,
    environment: 'node',
    passWithNoTests: true,
  },
})
