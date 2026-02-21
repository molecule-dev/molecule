# @molecule/api-staging-state

State management for active staging environments in molecule.dev.

Manages the `.molecule/staging.json` file that tracks ephemeral
branch-per-feature staging environments within a project.

## Type
`utility`

## Installation
```bash
npm install @molecule/api-staging-state
```

## Usage

```typescript
import { addEnvironment, listEnvironments, allocatePort } from '@molecule/api-staging-state'

const ports = await allocatePort('/path/to/project', { start: 4001, end: 4099 })
await addEnvironment('/path/to/project', {
  slug: 'feat-login',
  branch: 'feature/login',
  driver: 'docker-compose',
  status: 'running',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  urls: { api: `http://localhost:${ports.api}` },
  ports,
})
```

## API

### Interfaces

#### `StagingEnvironmentRecord`

Record for a single active staging environment.

```typescript
interface StagingEnvironmentRecord {
  /** Unique slug derived from branch name. */
  slug: string

  /** Original git branch name. */
  branch: string

  /** Name of the staging driver managing this environment. */
  driver: string

  /** ISO 8601 creation timestamp. */
  createdAt: string

  /** ISO 8601 last-updated timestamp. */
  updatedAt: string

  /** Deployed URLs. */
  urls: { api?: string; app?: string }

  /** Allocated ports. */
  ports: { api?: number; app?: number; db?: number }

  /** Current environment status. */
  status: 'running' | 'stopped' | 'error' | 'creating' | 'destroying'

  /** Driver-specific metadata. */
  driverMeta?: Record<string, unknown>
}
```

#### `StagingState`

Root state file schema for `.molecule/staging.json`.

```typescript
interface StagingState {
  /** Schema version. */
  version: 1

  /** Active environments keyed by slug. */
  environments: Record<string, StagingEnvironmentRecord>
}
```

### Functions

#### `addEnvironment(projectPath, record)`

Adds or updates an environment record in the state file.

```typescript
function addEnvironment(projectPath: string, record: StagingEnvironmentRecord): Promise<void>
```

- `projectPath` — Absolute path to the project root.
- `record` — The environment record to add or update.

#### `allocatePort(projectPath, portRange, portRange, portRange)`

Allocates a set of non-colliding ports for a new staging environment.
Each environment needs three ports: API, App, and DB. Ports are allocated
sequentially from the range, skipping any already in use.

```typescript
function allocatePort(projectPath: string, portRange: { start: number; end: number; }): Promise<{ api: number; app: number; db: number; }>
```

- `projectPath` — Absolute path to the project root.
- `portRange` — The port range to allocate from.
- `portRange` — .start - First port in the range (inclusive).
- `portRange` — .end - Last port in the range (inclusive).

**Returns:** An object with allocated `api`, `app`, and `db` ports.

#### `getEnvironment(projectPath, slug)`

Retrieves a single environment record by slug.

```typescript
function getEnvironment(projectPath: string, slug: string): Promise<StagingEnvironmentRecord | undefined>
```

- `projectPath` — Absolute path to the project root.
- `slug` — The slug to look up.

**Returns:** The environment record, or `undefined` if not found.

#### `listEnvironments(projectPath)`

Lists all active environment records.

```typescript
function listEnvironments(projectPath: string): Promise<StagingEnvironmentRecord[]>
```

- `projectPath` — Absolute path to the project root.

**Returns:** Array of all environment records.

#### `loadState(projectPath)`

Loads the staging state from disk.
Returns an empty state if the file does not exist.

```typescript
function loadState(projectPath: string): Promise<StagingState>
```

- `projectPath` — Absolute path to the project root.

**Returns:** The current staging state.

#### `removeEnvironment(projectPath, slug)`

Removes an environment record from the state file.

```typescript
function removeEnvironment(projectPath: string, slug: string): Promise<void>
```

- `projectPath` — Absolute path to the project root.
- `slug` — The slug of the environment to remove.

#### `saveState(projectPath, state)`

Persists the staging state to disk, creating the `.molecule/` directory if needed.

```typescript
function saveState(projectPath: string, state: StagingState): Promise<void>
```

- `projectPath` — Absolute path to the project root.
- `state` — The state to persist.

#### `statePath(projectPath)`

Returns the absolute path to the staging state file.

```typescript
function statePath(projectPath: string): string
```

- `projectPath` — Absolute path to the project root.

**Returns:** Absolute path to `.molecule/staging.json`.
