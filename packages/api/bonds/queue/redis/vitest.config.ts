import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: './vitest.typecheck.json',
      include: ['src/__tests__/index.test.ts'],
    },
    globals: true,
    environment: 'node',
  },
})
