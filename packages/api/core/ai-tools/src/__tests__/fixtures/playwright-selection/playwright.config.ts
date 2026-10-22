import { defineConfig } from '@playwright/test'

/**
 * A disposable project for the selection-semantics regression of `scopedRerunCommand`. Its specs
 * are named `.pw.ts` so the package's own vitest run does not collect them as unit tests.
 */
export default defineConfig({ testDir: './specs/e2e', testMatch: '**/*.pw.ts' })
