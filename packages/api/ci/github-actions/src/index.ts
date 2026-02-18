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
 *         commonSteps.cacheNodeModules(),
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
 * @module
 */

export * from './generator.js'
export * from './workflows/index.js'
