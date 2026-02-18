/**
 * Pre-built workflow factories and reusable step builders for GitHub Actions.
 *
 * @module
 */

import type { WorkflowConfig, WorkflowStep } from './types.js'

/**
 * Reusable step factory functions for common CI operations. Each method
 * returns a `WorkflowStep` that can be included in any workflow job's `steps` array.
 */
export const commonSteps = {
  checkout: (options?: { 'fetch-depth'?: number }): WorkflowStep => ({
    name: 'Checkout code',
    uses: 'actions/checkout@v4',
    with: options,
  }),

  setupNode: (version: string = '20'): WorkflowStep => ({
    name: 'Setup Node.js',
    uses: 'actions/setup-node@v4',
    with: {
      'node-version': version,
      cache: 'npm',
    },
  }),

  npmInstall: (): WorkflowStep => ({
    name: 'Install dependencies',
    run: 'npm ci',
  }),

  npmBuild: (): WorkflowStep => ({
    name: 'Build',
    run: 'npm run build',
  }),

  npmTest: (): WorkflowStep => ({
    name: 'Run tests',
    run: 'npm test',
  }),

  npmLint: (): WorkflowStep => ({
    name: 'Lint',
    run: 'npm run lint',
  }),

  cacheNodeModules: (): WorkflowStep => ({
    name: 'Cache node_modules',
    uses: 'actions/cache@v4',
    with: {
      path: 'node_modules',
      key: "${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}",
      'restore-keys': '${{ runner.os }}-node-',
    },
  }),
}

/**
 * Pre-built workflow template factories. Each method returns a complete
 * `WorkflowConfig` ready to pass to `generateWorkflow()` and write to disk.
 */
export const workflows = {
  /**
   * Standard CI workflow that runs install, build, and test on pushes
   * and pull requests to `main`.
   *
   * @returns A workflow config for basic continuous integration.
   */
  ci: (): WorkflowConfig => ({
    name: 'CI',
    on: {
      push: { branches: ['main'] },
      pull_request: { branches: ['main'] },
    },
    jobs: {
      build: {
        'runs-on': 'ubuntu-latest',
        steps: [
          commonSteps.checkout(),
          commonSteps.setupNode(),
          commonSteps.npmInstall(),
          commonSteps.npmBuild(),
          commonSteps.npmTest(),
        ],
      },
    },
  }),

  /**
   * CI workflow that tests across multiple Node.js versions using a matrix strategy.
   *
   * @param nodeVersions - Node.js versions to test against (defaults to `['18', '20', '22']`).
   * @returns A workflow config with matrix testing across the specified Node versions.
   */
  ciMatrix: (nodeVersions: string[] = ['18', '20', '22']): WorkflowConfig => ({
    name: 'CI Matrix',
    on: {
      push: { branches: ['main'] },
      pull_request: { branches: ['main'] },
    },
    jobs: {
      test: {
        'runs-on': 'ubuntu-latest',
        strategy: {
          matrix: { 'node-version': nodeVersions },
          'fail-fast': false,
        },
        steps: [
          commonSteps.checkout(),
          {
            name: 'Setup Node.js ${{ matrix.node-version }}',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '${{ matrix.node-version }}',
              cache: 'npm',
            },
          },
          commonSteps.npmInstall(),
          commonSteps.npmBuild(),
          commonSteps.npmTest(),
        ],
      },
    },
  }),

  /**
   * Release workflow triggered by version tags (`v*`). Runs the full CI pipeline
   * then publishes to npm using the `NPM_TOKEN` secret.
   *
   * @returns A workflow config for tag-based releases with npm publish.
   */
  release: (): WorkflowConfig => ({
    name: 'Release',
    on: {
      push: { tags: ['v*'] },
    },
    jobs: {
      release: {
        'runs-on': 'ubuntu-latest',
        steps: [
          commonSteps.checkout(),
          commonSteps.setupNode(),
          commonSteps.npmInstall(),
          commonSteps.npmBuild(),
          commonSteps.npmTest(),
          {
            name: 'Publish to npm',
            run: 'npm publish --access public',
            env: { NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}' },
          },
        ],
      },
    },
  }),

  /**
   * Integration test workflow with Postgres 16 and Redis 7 service containers.
   * Sets `DATABASE_URL` and `REDIS_URL` environment variables automatically.
   *
   * @returns A workflow config for integration testing with database services.
   */
  integrationTests: (): WorkflowConfig => ({
    name: 'Integration Tests',
    on: {
      push: { branches: ['main'] },
      pull_request: { branches: ['main'] },
    },
    jobs: {
      test: {
        'runs-on': 'ubuntu-latest',
        services: {
          postgres: {
            image: 'postgres:16',
            ports: ['5432:5432'],
            env: {
              POSTGRES_USER: 'test',
              POSTGRES_PASSWORD: 'test',
              POSTGRES_DB: 'test',
            },
            options:
              '--health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5',
          },
          redis: {
            image: 'redis:7',
            ports: ['6379:6379'],
          },
        },
        env: {
          DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
          REDIS_URL: 'redis://localhost:6379',
        },
        steps: [
          commonSteps.checkout(),
          commonSteps.setupNode(),
          commonSteps.npmInstall(),
          commonSteps.npmBuild(),
          {
            name: 'Run integration tests',
            run: 'npm run test:integration',
          },
        ],
      },
    },
  }),
}
