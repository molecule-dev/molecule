import { defineProjects } from 'vitest/config'

export default defineProjects([
  // API packages
  'packages/api/core/*/vitest.config.ts',
  'packages/api/bonds/*/*/vitest.config.ts',
  'packages/api/infrastructure/*/vitest.config.ts',
  'packages/api/resources/*/vitest.config.ts',
  'packages/api/middleware/*/vitest.config.ts',
  'packages/api/utilities/*/vitest.config.ts',
  'packages/api/testing/vitest.config.ts',
  'packages/api/ci/*/vitest.config.ts',

  // App packages
  'packages/app/core/*/vitest.config.ts',
  'packages/app/bonds/*/*/vitest.config.ts',
  'packages/app/features/*/vitest.config.ts',
  'packages/app/native/*/vitest.config.ts',

  // App framework packages
  'packages/app/frameworks/*/vitest.config.ts',
])
