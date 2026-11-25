import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.tests.json',
      include: [
        ...configDefaults.typecheck.include,
        'src/hooks/__tests__/{useFormPartialFill,useFormState,useOptimisticToggle}.test.tsx',
      ],
    },
  },
})
