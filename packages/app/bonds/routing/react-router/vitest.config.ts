import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.tests.json',
      include: [
        ...configDefaults.typecheck.include,
        'src/__tests__/{define-route,lazy-page,routers}.test.tsx',
      ],
    },
  },
})
