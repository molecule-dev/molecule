/**
 * GitHub Actions CI/CD templates and utilities for molecule.dev.
 *
 * Provides pre-built workflow configurations and a YAML generator for
 * setting up CI/CD pipelines.
 *
 * @example
 * ```typescript
 * import { mkdirSync, writeFileSync } from 'node:fs'
 * import { dirname } from 'node:path'
 *
 * import type { WorkflowConfig } from '@molecule/api-ci-github-actions'
 * import {
 *   commonSteps,
 *   generateWorkflow,
 *   workflowPath,
 *   workflows,
 * } from '@molecule/api-ci-github-actions'
 *
 * // Run from the repo root (e.g. a `scripts/ci.ts` you run once) — nothing is written for you.
 * const writeWorkflow = (name: string, config: WorkflowConfig): void => {
 *   const path = workflowPath(name) // '.github/workflows/<name>.yml'
 *   mkdirSync(dirname(path), { recursive: true })
 *   writeFileSync(path, generateWorkflow(config))
 * }
 *
 * // A scaffolded app's CI: lint, typecheck, build, db:setup against a Postgres service, test.
 * writeWorkflow('ci', workflows.projectCi({ database: true }))
 *
 * // A custom workflow assembled from the reusable steps:
 * writeWorkflow('nightly', {
 *   name: 'Nightly',
 *   on: { schedule: [{ cron: '0 3 * * *' }], workflow_dispatch: {} },
 *   jobs: {
 *     test: {
 *       'runs-on': 'ubuntu-latest',
 *       steps: [
 *         commonSteps.checkout(),
 *         commonSteps.setupNode('22'), // a STRING — '20.10' as a number would become 20.1
 *         commonSteps.npmInstall(),
 *         commonSteps.npmBuild(),
 *         commonSteps.npmTest(),
 *       ],
 *     },
 *   },
 * })
 * ```
 *
 * @remarks
 * Gotchas the generated workflows already account for — keep them in mind when
 * building custom configs:
 *
 * - `setupNode()` caches the npm download cache, which works with `npm ci`.
 *   Do NOT add `cacheNodeModules()` to an `npm ci` pipeline — `npm ci` deletes
 *   `node_modules` before installing, so that cache is discarded every run.
 * - Publishing to npm requires `registry-url` on the setup-node step (see
 *   `workflows.release()`); `NODE_AUTH_TOKEN` alone is silently ignored and
 *   `npm publish` fails with `ENEEDAUTH`.
 * - `workflows.stagingDeploy()` / `stagingTeardown()` with the `docker-compose`
 *   driver deploy to the machine running the workflow — on GitHub-hosted
 *   runners the environment dies when the job ends; use a persistent
 *   self-hosted runner.
 * - Version-like strings stay quoted in the YAML output on purpose: unquoted,
 *   `'20.10'` parses back as the float `20.1` and installs the wrong Node.
 * - **This package only BUILDS YAML strings** — `generateWorkflow()` returns the
 *   file content and `workflowPath()` returns the conventional relative path; neither
 *   touches the filesystem, and there is no `mlcl`/`npx` command that writes them.
 *   It is not a bond: there is nothing to `setProvider()`/`bond()`.
 * - `workflows.projectCi()` runs `npm run lint`, `npm run typecheck`, `npm run build`
 *   and `npm test` (plus `npm run db:setup` with `{ database: true }`, and
 *   `npm run test:e2e` with `{ e2e: true }`) — every one of those scripts must exist
 *   in the app's `package.json` or CI fails.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './generator.js'
export * from './workflows/index.js'
