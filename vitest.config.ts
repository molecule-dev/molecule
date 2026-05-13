/**
 * Root vitest config — supersedes the old `vitest.workspace.ts` file
 * (silently ignored under vitest 4.x). Aggregates per-package configs
 * via the `projects` field so each package's `environment: jsdom`
 * setting is honoured when running tests from the monorepo root.
 *
 * Adding a new package family? Append its glob below.
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      // API packages
      'packages/api/core/*/vitest.config.ts',
      'packages/api/bonds/*/*/vitest.config.ts',
      'packages/api/infrastructure/*/vitest.config.ts',
      'packages/api/resources/*/vitest.config.ts',
      'packages/api/ai/*/vitest.config.ts',
      'packages/api/middleware/*/vitest.config.ts',
      'packages/api/utilities/*/vitest.config.ts',
      'packages/api/testing/vitest.config.ts',
      'packages/api/ci/*/vitest.config.ts',

      // App packages
      'packages/app/core/*/vitest.config.ts',
      'packages/app/bonds/*/*/vitest.config.ts',
      'packages/app/bonds/native/*/*/vitest.config.ts',
      'packages/app/features/*/vitest.config.ts',
      'packages/app/native/*/vitest.config.ts',

      // App framework packages
      'packages/app/frameworks/*/vitest.config.ts',

      // (No catchall project — each package's own vitest.config.ts
      // declares its environment, mocks, and includes. monaco-editor and
      // other Vite-unfriendly deps stay outside the runner: run their
      // tests with `npm test` in the package dir.)
    ],
  },
})
