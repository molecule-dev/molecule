/**
 * Comprehensive tests for `@molecule/api-ci-github-actions`
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { commonSteps, generateWorkflow, toYAML, workflowPath, workflows } from '../index.js'
import type { WorkflowConfig } from '../workflows/types.js'

describe('@molecule/api-ci-github-actions', () => {
  describe('toYAML', () => {
    describe('primitive values', () => {
      it('should stringify null', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [{ run: 'echo hello' }],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain('name: Test')
      })

      it('should stringify booleans', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              strategy: {
                'fail-fast': false,
              },
              steps: [{ run: 'echo hello', 'continue-on-error': true }],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain("'fail-fast': false")
        expect(yaml).toContain("'continue-on-error': true")
      })

      it('should stringify numbers', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              'timeout-minutes': 30,
              steps: [{ run: 'echo hello' }],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain("'timeout-minutes': 30")
      })
    })

    describe('string quoting', () => {
      it('should quote strings containing colons', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [
                {
                  name: 'Test step',
                  env: { URL: 'http://localhost:3000' },
                },
              ],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain("'http://localhost:3000'")
      })

      it('should quote strings containing hash symbols', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [
                {
                  name: 'Test step',
                  env: { COMMENT: 'This # has a hash' },
                },
              ],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain("'This # has a hash'")
      })

      it('should quote strings starting with $', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [
                {
                  name: 'Test step',
                  env: { TOKEN: '${{ secrets.TOKEN }}' },
                },
              ],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain("'${{ secrets.TOKEN }}'")
      })

      it('should quote boolean-like strings', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [
                {
                  name: 'Test step',
                  env: { FLAG: 'true' },
                },
              ],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain("FLAG: 'true'")
      })

      it('should escape single quotes by doubling them', () => {
        const config: WorkflowConfig = {
          name: "It's a test",
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [{ run: 'echo hello' }],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain("'It''s a test'")
      })

      it('should quote empty strings', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [
                {
                  name: 'Test step',
                  env: { EMPTY: '' },
                },
              ],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain("EMPTY: ''")
      })
    })

    describe('arrays', () => {
      it('should stringify empty arrays as []', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: [] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [{ run: 'echo hello' }],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain('branches: []')
      })

      it('should stringify short simple arrays inline', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main', 'dev'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [{ run: 'echo hello' }],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain('branches: [main, dev]')
      })

      it('should stringify object arrays with dashes', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [
                { name: 'Step 1', run: 'echo 1' },
                { name: 'Step 2', run: 'echo 2' },
              ],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain('- name: Step 1')
        expect(yaml).toContain('- name: Step 2')
      })
    })

    describe('objects', () => {
      it('should stringify empty objects as {}', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: {},
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [{ run: 'echo hello' }],
            },
          },
        }
        const yaml = toYAML(config)
        // Empty object on its own line
        expect(yaml).toContain('on:\n{}')
      })

      it('should quote keys with hyphens', () => {
        const config: WorkflowConfig = {
          name: 'Test',
          on: { push: { branches: ['main'] } },
          jobs: {
            test: {
              'runs-on': 'ubuntu-latest',
              steps: [{ run: 'echo hello' }],
            },
          },
        }
        const yaml = toYAML(config)
        expect(yaml).toContain("'runs-on': ubuntu-latest")
      })
    })
  })

  describe('generateWorkflow', () => {
    it('should add header comment to generated workflow', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'echo hello' }],
          },
        },
      }
      const yaml = generateWorkflow(config)
      expect(yaml).toContain('# Generated by @molecule/api-ci-github-actions')
      expect(yaml).toContain('# Do not edit manually')
      expect(yaml).toContain('npx molecule ci generate')
    })

    it('should include the full workflow config after the header', () => {
      const config: WorkflowConfig = {
        name: 'My CI',
        on: { push: { branches: ['main'] } },
        jobs: {
          build: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'npm run build' }],
          },
        },
      }
      const yaml = generateWorkflow(config)
      expect(yaml).toContain('name: My CI')
      expect(yaml).toContain('build:')
    })
  })

  describe('workflowPath', () => {
    it('should return the correct path for a workflow name', () => {
      expect(workflowPath('ci')).toBe('.github/workflows/ci.yml')
      expect(workflowPath('release')).toBe('.github/workflows/release.yml')
      expect(workflowPath('integration-tests')).toBe('.github/workflows/integration-tests.yml')
    })
  })

  describe('commonSteps', () => {
    describe('checkout', () => {
      it('should return a checkout step with default options', () => {
        const step = commonSteps.checkout()
        expect(step.name).toBe('Checkout code')
        expect(step.uses).toBe('actions/checkout@v4')
        expect(step.with).toBeUndefined()
      })

      it('should return a checkout step with custom fetch-depth', () => {
        const step = commonSteps.checkout({ 'fetch-depth': 0 })
        expect(step.name).toBe('Checkout code')
        expect(step.uses).toBe('actions/checkout@v4')
        expect(step.with).toEqual({ 'fetch-depth': 0 })
      })
    })

    describe('setupNode', () => {
      it('should return a setup-node step with default version 20', () => {
        const step = commonSteps.setupNode()
        expect(step.name).toBe('Setup Node.js')
        expect(step.uses).toBe('actions/setup-node@v4')
        expect(step.with).toEqual({
          'node-version': '20',
          cache: 'npm',
        })
      })

      it('should return a setup-node step with custom version', () => {
        const step = commonSteps.setupNode('18')
        expect(step.with).toEqual({
          'node-version': '18',
          cache: 'npm',
        })
      })
    })

    describe('npmInstall', () => {
      it('should return an npm ci step', () => {
        const step = commonSteps.npmInstall()
        expect(step.name).toBe('Install dependencies')
        expect(step.run).toBe('npm ci')
      })
    })

    describe('npmBuild', () => {
      it('should return an npm build step', () => {
        const step = commonSteps.npmBuild()
        expect(step.name).toBe('Build')
        expect(step.run).toBe('npm run build')
      })
    })

    describe('npmTest', () => {
      it('should return an npm test step', () => {
        const step = commonSteps.npmTest()
        expect(step.name).toBe('Run tests')
        expect(step.run).toBe('npm test')
      })
    })

    describe('npmLint', () => {
      it('should return an npm lint step', () => {
        const step = commonSteps.npmLint()
        expect(step.name).toBe('Lint')
        expect(step.run).toBe('npm run lint')
      })
    })

    describe('cacheNodeModules', () => {
      it('should return a cache step for node_modules', () => {
        const step = commonSteps.cacheNodeModules()
        expect(step.name).toBe('Cache node_modules')
        expect(step.uses).toBe('actions/cache@v4')
        expect(step.with).toEqual({
          path: 'node_modules',
          key: "${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}",
          'restore-keys': '${{ runner.os }}-node-',
        })
      })
    })
  })

  describe('workflows', () => {
    describe('ci', () => {
      let workflow: WorkflowConfig

      beforeEach(() => {
        workflow = workflows.ci()
      })

      it('should have correct name', () => {
        expect(workflow.name).toBe('CI')
      })

      it('should trigger on push to main', () => {
        expect(workflow.on.push?.branches).toEqual(['main'])
      })

      it('should trigger on pull requests to main', () => {
        expect(workflow.on.pull_request?.branches).toEqual(['main'])
      })

      it('should have a build job', () => {
        expect(workflow.jobs.build).toBeDefined()
        expect(workflow.jobs.build['runs-on']).toBe('ubuntu-latest')
      })

      it('should have correct steps in build job', () => {
        const steps = workflow.jobs.build.steps
        expect(steps).toHaveLength(5)
        expect(steps[0].uses).toBe('actions/checkout@v4')
        expect(steps[1].uses).toBe('actions/setup-node@v4')
        expect(steps[2].run).toBe('npm ci')
        expect(steps[3].run).toBe('npm run build')
        expect(steps[4].run).toBe('npm test')
      })
    })

    describe('ciMatrix', () => {
      it('should have correct name', () => {
        const workflow = workflows.ciMatrix()
        expect(workflow.name).toBe('CI Matrix')
      })

      it('should use default node versions', () => {
        const workflow = workflows.ciMatrix()
        expect(workflow.jobs.test.strategy?.matrix?.['node-version']).toEqual(['18', '20', '22'])
      })

      it('should use custom node versions when provided', () => {
        const workflow = workflows.ciMatrix(['16', '18', '20'])
        expect(workflow.jobs.test.strategy?.matrix?.['node-version']).toEqual(['16', '18', '20'])
      })

      it('should have fail-fast disabled', () => {
        const workflow = workflows.ciMatrix()
        expect(workflow.jobs.test.strategy?.['fail-fast']).toBe(false)
      })

      it('should use matrix variable for node version', () => {
        const workflow = workflows.ciMatrix()
        const setupStep = workflow.jobs.test.steps[1]
        expect(setupStep.name).toBe('Setup Node.js ${{ matrix.node-version }}')
        expect(setupStep.with?.['node-version']).toBe('${{ matrix.node-version }}')
      })
    })

    describe('release', () => {
      let workflow: WorkflowConfig

      beforeEach(() => {
        workflow = workflows.release()
      })

      it('should have correct name', () => {
        expect(workflow.name).toBe('Release')
      })

      it('should trigger on version tags', () => {
        expect(workflow.on.push?.tags).toEqual(['v*'])
      })

      it('should not trigger on branches', () => {
        expect(workflow.on.push?.branches).toBeUndefined()
      })

      it('should have a release job', () => {
        expect(workflow.jobs.release).toBeDefined()
        expect(workflow.jobs.release['runs-on']).toBe('ubuntu-latest')
      })

      it('should include npm publish step', () => {
        const steps = workflow.jobs.release.steps
        const publishStep = steps.find((s) => s.run === 'npm publish --access public')
        expect(publishStep).toBeDefined()
        expect(publishStep?.env?.NODE_AUTH_TOKEN).toBe('${{ secrets.NPM_TOKEN }}')
      })
    })

    describe('integrationTests', () => {
      let workflow: WorkflowConfig

      beforeEach(() => {
        workflow = workflows.integrationTests()
      })

      it('should have correct name', () => {
        expect(workflow.name).toBe('Integration Tests')
      })

      it('should trigger on push and pull requests to main', () => {
        expect(workflow.on.push?.branches).toEqual(['main'])
        expect(workflow.on.pull_request?.branches).toEqual(['main'])
      })

      it('should define postgres service', () => {
        const postgres = workflow.jobs.test.services?.postgres
        expect(postgres).toBeDefined()
        expect(postgres?.image).toBe('postgres:16')
        expect(postgres?.ports).toEqual(['5432:5432'])
        expect(postgres?.env).toEqual({
          POSTGRES_USER: 'test',
          POSTGRES_PASSWORD: 'test',
          POSTGRES_DB: 'test',
        })
        expect(postgres?.options).toContain('--health-cmd pg_isready')
      })

      it('should define redis service', () => {
        const redis = workflow.jobs.test.services?.redis
        expect(redis).toBeDefined()
        expect(redis?.image).toBe('redis:7')
        expect(redis?.ports).toEqual(['6379:6379'])
      })

      it('should set database environment variables', () => {
        expect(workflow.jobs.test.env?.DATABASE_URL).toBe(
          'postgresql://test:test@localhost:5432/test',
        )
        expect(workflow.jobs.test.env?.REDIS_URL).toBe('redis://localhost:6379')
      })

      it('should run integration tests command', () => {
        const steps = workflow.jobs.test.steps
        const testStep = steps.find((s) => s.run === 'npm run test:integration')
        expect(testStep).toBeDefined()
        expect(testStep?.name).toBe('Run integration tests')
      })
    })
  })

  describe('full workflow YAML generation', () => {
    it('should generate valid YAML for CI workflow', () => {
      const yaml = generateWorkflow(workflows.ci())

      // Check structure
      expect(yaml).toContain('name: CI')
      expect(yaml).toContain('on:')
      expect(yaml).toContain('push:')
      expect(yaml).toContain('branches: [main]')
      expect(yaml).toContain('jobs:')
      expect(yaml).toContain('build:')
      expect(yaml).toContain("'runs-on': ubuntu-latest")
      expect(yaml).toContain('steps:')
    })

    it('should generate valid YAML for matrix workflow', () => {
      const yaml = generateWorkflow(workflows.ciMatrix())

      expect(yaml).toContain('strategy:')
      expect(yaml).toContain('matrix:')
      expect(yaml).toContain("'node-version': [18, 20, 22]")
      expect(yaml).toContain("'fail-fast': false")
    })

    it('should generate valid YAML for release workflow', () => {
      const yaml = generateWorkflow(workflows.release())

      expect(yaml).toContain('tags: [v*]')
      expect(yaml).toContain('Publish to npm')
      expect(yaml).toContain("'${{ secrets.NPM_TOKEN }}'")
    })

    it('should generate valid YAML for integration tests workflow', () => {
      const yaml = generateWorkflow(workflows.integrationTests())

      expect(yaml).toContain('services:')
      expect(yaml).toContain('postgres:')
      expect(yaml).toContain('redis:')
      expect(yaml).toContain("'postgres:16'")
      expect(yaml).toContain("'redis:7'")
      expect(yaml).toContain('POSTGRES_USER: test')
      expect(yaml).toContain('DATABASE_URL:')
    })
  })

  describe('edge cases', () => {
    it('should handle workflow with concurrency settings', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        concurrency: {
          group: '${{ github.workflow }}-${{ github.ref }}',
          'cancel-in-progress': true,
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'echo hello' }],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain('concurrency:')
      expect(yaml).toContain("group: '${{ github.workflow }}-${{ github.ref }}'")
      expect(yaml).toContain("'cancel-in-progress': true")
    })

    it('should handle workflow with global env variables', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        env: {
          CI: 'true',
          NODE_ENV: 'test',
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'echo hello' }],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain('env:')
      expect(yaml).toContain("CI: 'true'")
      expect(yaml).toContain('NODE_ENV: test')
    })

    it('should handle job with needs dependency', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        jobs: {
          build: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'npm run build' }],
          },
          test: {
            'runs-on': 'ubuntu-latest',
            needs: 'build',
            steps: [{ run: 'npm test' }],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain('needs: build')
    })

    it('should handle job with multiple needs dependencies', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        jobs: {
          build: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'npm run build' }],
          },
          lint: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'npm run lint' }],
          },
          deploy: {
            'runs-on': 'ubuntu-latest',
            needs: ['build', 'lint'],
            steps: [{ run: 'npm run deploy' }],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain('needs: [build, lint]')
    })

    it('should handle step with conditional if', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              {
                name: 'Deploy',
                run: 'npm run deploy',
                if: "github.ref == 'refs/heads/main'",
              },
            ],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain("if: 'github.ref == ''refs/heads/main'''")
    })

    it('should handle workflow_dispatch with inputs', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: {
          workflow_dispatch: {
            inputs: {
              environment: {
                description: 'Deployment environment',
                required: true,
                type: 'choice',
                options: ['staging', 'production'],
                default: 'staging',
              },
            },
          },
        },
        jobs: {
          deploy: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'echo ${{ inputs.environment }}' }],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain('workflow_dispatch:')
      expect(yaml).toContain('inputs:')
      expect(yaml).toContain('environment:')
      expect(yaml).toContain('description: Deployment environment')
      expect(yaml).toContain('type: choice')
      expect(yaml).toContain('options:')
    })

    it('should handle scheduled workflows', () => {
      const config: WorkflowConfig = {
        name: 'Scheduled Test',
        on: {
          schedule: [{ cron: '0 0 * * *' }],
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'npm test' }],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain('schedule:')
      // cron value with spaces doesn't need quoting per the YAML generator
      expect(yaml).toContain('cron: 0 0 * * *')
    })

    it('should handle job outputs', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        jobs: {
          build: {
            'runs-on': 'ubuntu-latest',
            outputs: {
              version: '${{ steps.version.outputs.version }}',
            },
            steps: [
              {
                id: 'version',
                run: 'echo "version=1.0.0" >> $GITHUB_OUTPUT',
              },
            ],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain('outputs:')
      expect(yaml).toContain("version: '${{ steps.version.outputs.version }}'")
    })

    it('should handle step with working-directory', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              {
                name: 'Build frontend',
                run: 'npm run build',
                'working-directory': './frontend',
              },
            ],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain("'working-directory': ./frontend")
    })

    it('should handle step with timeout-minutes', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              {
                name: 'Long running test',
                run: 'npm run test:e2e',
                'timeout-minutes': 60,
              },
            ],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain("'timeout-minutes': 60")
    })

    it('should handle paths and paths-ignore triggers', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: {
          push: {
            branches: ['main'],
            paths: ['src/**', 'package.json'],
            'paths-ignore': ['docs/**', '*.md'],
          },
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'npm test' }],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain('paths:')
      expect(yaml).toContain("'paths-ignore':")
    })

    it('should handle pull_request with types', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: {
          pull_request: {
            branches: ['main'],
            types: ['opened', 'synchronize', 'reopened'],
          },
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [{ run: 'npm test' }],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain('types: [opened, synchronize, reopened]')
    })

    it('should handle matrix with max-parallel', () => {
      const config: WorkflowConfig = {
        name: 'Test',
        on: { push: { branches: ['main'] } },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            strategy: {
              matrix: { os: ['ubuntu-latest', 'macos-latest', 'windows-latest'] },
              'max-parallel': 2,
            },
            steps: [{ run: 'npm test' }],
          },
        },
      }
      const yaml = toYAML(config)
      expect(yaml).toContain("'max-parallel': 2")
    })
  })
})
