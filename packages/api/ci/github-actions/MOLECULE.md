# @molecule/api-ci-github-actions

GitHub Actions CI/CD templates and utilities for molecule.dev.

Provides pre-built workflow configurations and a YAML generator for
setting up CI/CD pipelines.

## Type
`infrastructure`

## Installation
```bash
npm install @molecule/api-ci-github-actions
```

## Usage

```typescript
import {
  workflows,
  commonSteps,
  generateWorkflow,
  workflowPath,
} from '@molecule/api-ci-github-actions'
import type { WorkflowConfig } from '@molecule/api-ci-github-actions'

// Use a pre-built workflow
const ciWorkflow = workflows.ci()
const yaml = generateWorkflow(ciWorkflow)
// Write to .github/workflows/ci.yml

// Build a custom workflow using common steps
const customWorkflow: WorkflowConfig = {
  name: 'Custom CI',
  on: {
    push: { branches: ['main', 'develop'] },
    pull_request: { branches: ['main'] },
  },
  jobs: {
    build: {
      'runs-on': 'ubuntu-latest',
      steps: [
        commonSteps.checkout(),
        commonSteps.setupNode('20'),
        commonSteps.cacheNodeModules(),
        commonSteps.npmInstall(),
        commonSteps.npmLint(),
        commonSteps.npmBuild(),
        commonSteps.npmTest(),
      ],
    },
  },
}
```

## API

### Interfaces

#### `WorkflowConfig`

Complete workflow configuration that maps to a `.github/workflows/*.yml` file.
Contains the workflow name, trigger rules, optional global environment variables,
concurrency settings, and one or more jobs.

```typescript
interface WorkflowConfig {
  name: string
  on: WorkflowTrigger
  env?: Record<string, string>
  concurrency?: {
    group: string
    'cancel-in-progress'?: boolean
  }
  jobs: Record<string, WorkflowJob>
}
```

#### `WorkflowJob`

A workflow job that runs on a specified runner. Contains an ordered list of steps,
optional service containers (e.g. Postgres, Redis), matrix strategy, and job dependencies.

```typescript
interface WorkflowJob {
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
```

#### `WorkflowStep`

A single step within a workflow job. Each step either runs a shell command (`run`)
or uses a GitHub Action (`uses`), with optional environment variables and conditionals.

```typescript
interface WorkflowStep {
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
```

#### `WorkflowTrigger`

Defines when a workflow runs — which branches, tags, paths, schedules,
or manual triggers activate it. Maps to the `on:` key in workflow YAML.

```typescript
interface WorkflowTrigger {
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
  delete?: Record<string, never>
}
```

### Functions

#### `generateWorkflow(config)`

Generates a complete workflow file with a header comment indicating it was
auto-generated. The output is ready to write to `.github/workflows/`.

```typescript
function generateWorkflow(config: WorkflowConfig): string
```

- `config` — The workflow configuration to generate.

**Returns:** The complete YAML file content including the auto-generated header.

#### `toYAML(config)`

Serializes a workflow configuration object to a YAML string suitable
for writing to `.github/workflows/*.yml`.

```typescript
function toYAML(config: WorkflowConfig): string
```

- `config` — The workflow configuration to serialize.

**Returns:** The YAML string representation of the workflow.

#### `workflowPath(name)`

Returns the conventional file path for a GitHub Actions workflow file.

```typescript
function workflowPath(name: string): string
```

- `name` — The workflow name (e.g. `'ci'`, `'release'`).

**Returns:** The path relative to the repo root (e.g. `.github/workflows/ci.yml`).

### Constants

#### `commonSteps`

Reusable step factory functions for common CI operations. Each method
returns a `WorkflowStep` that can be included in any workflow job's `steps` array.

```typescript
const commonSteps: { checkout: (options?: { "fetch-depth"?: number; }) => WorkflowStep; setupNode: (version?: string) => WorkflowStep; npmInstall: () => WorkflowStep; npmBuild: () => WorkflowStep; npmTest: () => WorkflowStep; npmLint: () => WorkflowStep; cacheNodeModules: () => WorkflowStep; stageUp: (driver?: string) => WorkflowStep; stageDown: () => WorkflowStep; }
```

#### `workflows`

Pre-built workflow template factories. Each method returns a complete
`WorkflowConfig` ready to pass to `generateWorkflow()` and write to disk.

```typescript
const workflows: { ci: () => WorkflowConfig; ciMatrix: (nodeVersions?: string[]) => WorkflowConfig; release: () => WorkflowConfig; integrationTests: () => WorkflowConfig; stagingDeploy: (options?: { driver?: string; excludeBranches?: string[]; }) => WorkflowConfig; stagingTeardown: () => WorkflowConfig; }
```
