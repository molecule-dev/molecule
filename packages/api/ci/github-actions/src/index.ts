/**
 * GitHub Actions CI/CD templates and utilities for molecule.dev.
 *
 * Provides pre-built workflow configurations and a YAML generator for
 * setting up CI/CD pipelines.
 *
 * @example
 * ```typescript
 * import {
 *   workflows,
 *   commonSteps,
 *   generateWorkflow,
 *   workflowPath,
 * } from '@molecule/api-ci-github-actions'
 * import type { WorkflowConfig } from '@molecule/api-ci-github-actions'
 *
 * // Use a pre-built workflow
 * const ciWorkflow = workflows.ci()
 * const yaml = generateWorkflow(ciWorkflow)
 * // Write to .github/workflows/ci.yml
 *
 * // Build a custom workflow using common steps
 * const customWorkflow: WorkflowConfig = {
 *   name: 'Custom CI',
 *   on: {
 *     push: { branches: ['main', 'develop'] },
 *     pull_request: { branches: ['main'] },
 *   },
 *   jobs: {
 *     build: {
 *       'runs-on': 'ubuntu-latest',
 *       steps: [
 *         commonSteps.checkout(),
 *         commonSteps.setupNode('20'),
 *         commonSteps.npmInstall(),
 *         commonSteps.npmLint(),
 *         commonSteps.npmBuild(),
 *         commonSteps.npmTest(),
 *       ],
 *     },
 *   },
 * }
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
 *
 * @module
 */

export * from './browser-guard.js'
export * from './generator.js'
export * from './workflows/index.js'
