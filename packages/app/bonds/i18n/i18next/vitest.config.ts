import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.tests.json',
      include: [...configDefaults.typecheck.include, 'src/__tests__/index.test.ts'],
    },
  },
})
