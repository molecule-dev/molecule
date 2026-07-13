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

  /**
   * Step that installs Node.js with npm caching enabled.
   *
   * Pass `registryUrl` when a later step runs `npm publish`: actions/setup-node
   * only writes the `NODE_AUTH_TOKEN` auth line into `.npmrc` when its
   * `registry-url` input is set — without it the token env var is silently
   * ignored and publish fails with `ENEEDAUTH` even though the secret is set.
   *
   * @param version - Node.js version to install (default: `'20'`).
   * @param options - Optional settings.
   * @param options.registryUrl - npm registry to configure for authenticated publishes
   *   (e.g. `'https://registry.npmjs.org'`).
   * @returns A workflow step that runs actions/setup-node.
   */
  setupNode: (version: string = '20', options?: { registryUrl?: string }): WorkflowStep => ({
    name: 'Setup Node.js',
    uses: 'actions/setup-node@v4',
    with: {
      'node-version': version,
      cache: 'npm',
      ...(options?.registryUrl ? { 'registry-url': options.registryUrl } : {}),
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

  /**
   * Step that caches the `node_modules` directory directly.
   *
   * Do NOT combine this with `npmInstall()` (`npm ci`): `npm ci` deletes
   * `node_modules` before installing, so the restored cache is thrown away on
   * every run and the step is pure overhead. `setupNode()` already caches the
   * npm download cache (`cache: 'npm'`), which IS compatible with `npm ci` —
   * prefer that. Only use this step with plain `npm install` pipelines.
   *
   * @returns A workflow step that caches `node_modules` keyed on the lockfile hash.
   */
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
   * @param nodeVersions - Node.js versions to test against (defaults to
   *   `['20', '22', '24']` — the actively-maintained LTS/current lines; Node 18
   *   reached EOL in April 2025, so it is deliberately not in the default).
   * @returns A workflow config with matrix testing across the specified Node versions.
   */
  ciMatrix: (nodeVersions: string[] = ['20', '22', '24']): WorkflowConfig => ({
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
   * then publishes to npm using the `NPM_TOKEN` secret. The setup-node step sets
   * `registry-url` — required for `NODE_AUTH_TOKEN` to be picked up at all; without
   * it `npm publish` fails with `ENEEDAUTH` even when the secret is configured.
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
          commonSteps.setupNode('20', { registryUrl: 'https://registry.npmjs.org' }),
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
   * The default `docker-compose` driver deploys to the machine RUNNING the
   * workflow: on GitHub-hosted runners the containers (and their localhost
   * URLs) are destroyed as soon as the job ends, so this workflow only
   * delivers a reachable environment on a persistent self-hosted runner
   * (or with a remote driver).
   *
   * The 'Comment PR with staging URL' step runs an inline `github-script`
   * that looks up the open PR for the pushed branch via
   * `github.rest.pulls.list()` (this workflow triggers on `push`, not
   * `pull_request` — there is no `pull_request` event to gate on) and slugs
   * the branch with the SAME algorithm as `@molecule/api-staging`'s
   * `branchToSlug()` so the `.molecule/staging.json` lookup matches the
   * slug `mlcl stage up` actually used.
   *
   * @param options - Optional driver and branch filtering.
   * @param options.driver - Staging driver to use (e.g. `'docker-compose'`).
   * @param options.excludeBranches - Branch patterns to exclude from staging deploys
   *   (rendered as negative `!pattern` entries in the push branch filter).
   * @returns A workflow config for ephemeral staging deployment.
   */
  stagingDeploy: (options?: { driver?: string; excludeBranches?: string[] }): WorkflowConfig => ({
    name: 'Staging Deploy',
    on: {
      push: {
        branches: ['**', ...(options?.excludeBranches ?? []).map((pattern) => `!${pattern}`)],
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
            // Not gated on `github.event_name == 'pull_request'`: this
            // workflow triggers ONLY on `push` (see `on.push` above), so that
            // guard was never true and the step never ran. Instead, the
            // script itself looks up the PR open for this branch (if any)
            // via the API — reachable on every push, and a no-op (logged,
            // not silent) when no PR exists yet.
            name: 'Comment PR with staging URL',
            uses: 'actions/github-script@v7',
            with: {
              script: [
                "const fs = require('fs');",
                'try {',
                "  const state = JSON.parse(fs.readFileSync('.molecule/staging.json', 'utf-8'));",
                '  const branch = process.env.GITHUB_REF_NAME;',
                // Mirrors @molecule/api-staging's branchToSlug() EXACTLY
                // (lowercase, strip refs/heads/, non-alnum-dash -> dash,
                // collapse runs of dashes, trim edge dashes, cap at 40,
                // re-trim a trailing dash the cap may expose). A divergent
                // slugify here silently misses state.environments[slug] even
                // when the branch deployed fine.
                '  const slug = branch',
                '    .toLowerCase()',
                "    .replace(/^refs\\/heads\\//, '')",
                "    .replace(/[^a-z0-9-]/g, '-')",
                "    .replace(/-+/g, '-')",
                "    .replace(/^-|-$/g, '')",
                '    .slice(0, 40)',
                "    .replace(/-$/, '');",
                '  const env = state.environments[slug];',
                '  if (!env) {',
                '    console.log(`No staging state found for slug "${slug}" (branch "${branch}")`);',
                '    return;',
                '  }',
                '  const { data: prs } = await github.rest.pulls.list({',
                '    ...context.repo,',
                '    head: `${context.repo.owner}:${branch}`,',
                "    state: 'open',",
                '  });',
                '  if (prs.length === 0) {',
                '    console.log(`No open pull request found for branch "${branch}"`);',
                '    return;',
                '  }',
                "  const body = `## Staging Environment\\n\\n- API: ${env.urls.api || 'N/A'}\\n- App: ${env.urls.app || 'N/A'}`;",
                '  await Promise.all(',
                '    prs.map((pr) =>',
                '      github.rest.issues.createComment({ ...context.repo, issue_number: pr.number, body }),',
                '    ),',
                '  );',
                "} catch (e) { console.log('Could not comment staging URL on PR: ' + e.message); }",
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
   * Like `stagingDeploy`, this assumes the runner that executes it is the
   * SAME machine that hosts the environments (a persistent self-hosted
   * runner): the `docker-compose` driver's containers and the
   * `.molecule/staging.json` state live on that machine, not in the repo,
   * so on an ephemeral GitHub-hosted runner there is nothing to tear down.
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
