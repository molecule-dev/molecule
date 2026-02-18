/**
 * TypeScript type definitions mirroring the GitHub Actions workflow YAML schema.
 *
 * @module
 */

/**
 * Defines when a workflow runs — which branches, tags, paths, schedules,
 * or manual triggers activate it. Maps to the `on:` key in workflow YAML.
 */
export interface WorkflowTrigger {
  push?: {
    branches?: string[]
    tags?: string[]
    paths?: string[]
    'paths-ignore'?: string[]
  }
  pull_request?: {
    branches?: string[]
    types?: string[]
  }
  workflow_dispatch?: {
    inputs?: Record<
      string,
      {
        description: string
        required?: boolean
        default?: string
        type?: 'string' | 'boolean' | 'choice' | 'environment'
        options?: string[]
      }
    >
  }
  schedule?: Array<{ cron: string }>
}

/**
 * A single step within a workflow job. Each step either runs a shell command (`run`)
 * or uses a GitHub Action (`uses`), with optional environment variables and conditionals.
 */
export interface WorkflowStep {
  name?: string
  id?: string
  uses?: string
  run?: string
  with?: Record<string, string | number | boolean>
  env?: Record<string, string>
  if?: string
  'working-directory'?: string
  'continue-on-error'?: boolean
  'timeout-minutes'?: number
}

/**
 * A workflow job that runs on a specified runner. Contains an ordered list of steps,
 * optional service containers (e.g. Postgres, Redis), matrix strategy, and job dependencies.
 */
export interface WorkflowJob {
  name?: string
  'runs-on': string | string[]
  needs?: string | string[]
  if?: string
  env?: Record<string, string>
  strategy?: {
    matrix?: Record<string, unknown[]>
    'fail-fast'?: boolean
    'max-parallel'?: number
  }
  steps: WorkflowStep[]
  services?: Record<
    string,
    {
      image: string
      ports?: string[]
      env?: Record<string, string>
      options?: string
    }
  >
  outputs?: Record<string, string>
  'timeout-minutes'?: number
}

/**
 * Complete workflow configuration that maps to a `.github/workflows/*.yml` file.
 * Contains the workflow name, trigger rules, optional global environment variables,
 * concurrency settings, and one or more jobs.
 */
export interface WorkflowConfig {
  name: string
  on: WorkflowTrigger
  env?: Record<string, string>
  concurrency?: {
    group: string
    'cancel-in-progress'?: boolean
  }
  jobs: Record<string, WorkflowJob>
}
