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

  /**
   * Step that deploys a staging environment for the current branch.
   *
   * @param driver - Staging driver to use (default: `'docker-compose'`).
   * @returns A workflow step that runs `npx mlcl stage up`.
   */
  stageUp: (driver?: string): WorkflowStep => ({
    name: 'Deploy staging environment',
    run: `npx mlcl stage up --branch \${{ github.ref_name }}${driver ? ` --driver ${driver}` : ''}`,
  }),

  /**
   * Step that tears down a staging environment.
   *
   * @returns A workflow step that runs `npx mlcl stage down --force`.
   */
  stageDown: (): WorkflowStep => ({
    name: 'Tear down staging environment',
    run: 'npx mlcl stage down --branch ${{ github.head_ref || github.event.ref }} --force',
    'continue-on-error': true,
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

  /**
   * Staging deploy workflow triggered on pushes to non-main branches.
   * Builds the project and deploys an ephemeral staging environment.
   * Uses concurrency groups to cancel outdated deployments.
   *
   * @param options - Optional driver and branch filtering.
   * @param options.driver - Staging driver to use (e.g. `'docker-compose'`).
   * @param options.excludeBranches - Branch patterns to exclude from staging deploys.
   * @returns A workflow config for ephemeral staging deployment.
   */
  stagingDeploy: (options?: { driver?: string; excludeBranches?: string[] }): WorkflowConfig => ({
    name: 'Staging Deploy',
    on: {
      push: {
        branches: ['**'],
        'paths-ignore': ['docs/**', '*.md'],
      },
    },
    concurrency: {
      group: 'staging-${{ github.ref_name }}',
      'cancel-in-progress': true,
    },
    jobs: {
      deploy: {
        'runs-on': 'ubuntu-latest',
        if: "github.ref != 'refs/heads/main'",
        steps: [
          commonSteps.checkout(),
          commonSteps.setupNode(),
          commonSteps.npmInstall(),
          commonSteps.npmBuild(),
          commonSteps.stageUp(options?.driver),
          {
            name: 'Comment PR with staging URL',
            if: "github.event_name == 'pull_request'",
            uses: 'actions/github-script@v7',
            with: {
              script: [
                "const fs = require('fs');",
                'try {',
                "  const state = JSON.parse(fs.readFileSync('.molecule/staging.json', 'utf-8'));",
                "  const slug = process.env.GITHUB_REF_NAME.replace(/[^a-z0-9-]/gi, '-').toLowerCase();",
                '  const env = state.environments[slug];',
                '  if (env) {',
                "    const body = `## Staging Environment\\n\\n- API: ${env.urls.api || 'N/A'}\\n- App: ${env.urls.app || 'N/A'}`;",
                '    await github.rest.issues.createComment({ ...context.repo, issue_number: context.issue.number, body });',
                '  }',
                "} catch (e) { console.log('No staging state found'); }",
              ].join('\n'),
            },
          },
        ],
      },
    },
  }),

  /**
   * Staging teardown workflow triggered on PR close and branch deletion.
   * Cleans up the ephemeral staging environment for the closed/deleted branch.
   *
   * @returns A workflow config for staging environment teardown.
   */
  stagingTeardown: (): WorkflowConfig => ({
    name: 'Staging Teardown',
    on: {
      pull_request: {
        types: ['closed'],
      },
      delete: {},
    },
    jobs: {
      teardown: {
        'runs-on': 'ubuntu-latest',
        steps: [
          commonSteps.checkout(),
          commonSteps.setupNode(),
          commonSteps.npmInstall(),
          commonSteps.stageDown(),
        ],
      },
    },
  }),
}
