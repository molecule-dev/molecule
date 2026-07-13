# @molecule/api-staging-docker-compose

Docker Compose staging driver for molecule.dev.

Manages ephemeral staging environments using Docker Compose.
Each feature branch gets isolated API, App, and database containers
with unique port allocations and networking.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-staging'
import { provider } from '@molecule/api-staging-docker-compose'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-staging-docker-compose
```

## API

### Interfaces

#### `ComposeGeneratorConfig`

Configuration for Docker Compose file generation.

```typescript
interface ComposeGeneratorConfig {
  /** Allocated API port on the host. */
  apiPort: number

  /** Allocated App port on the host. */
  appPort: number

  /** Allocated database port on the host. */
  dbPort: number

  /** Relative path from compose file to the API project root. */
  apiContext?: string

  /** Relative path from compose file to the App project root. */
  appContext?: string

  /** Path to generated Dockerfiles directory, relative to the compose file. */
  dockerfilePath?: string
}
```

### Functions

#### `generateComposeFile(env, config)`

Generates a Docker Compose YAML string for a staging environment.

The API service uses runtime env_file layering (Node.js reads process.env).
The App service uses Docker build args for VITE_* variables (Vite inlines
them at build time; runtime env vars have no effect on the served bundle).

Requires Docker Compose v2.24+ (long-syntax `env_file` with `required:
false` — the base `.env` / `.env.staging` layers are OPTIONAL; short syntax
hard-fails `up` on any project that doesn't have both files) and BuildKit
(`additional_contexts`, which lets the app image copy the generated
`nginx.conf` from the staging directory — it is NOT inside the app build
context).

```typescript
function generateComposeFile(env: StagingEnvironment, config: ComposeGeneratorConfig): string
```

- `env` — The staging environment descriptor.
- `config` — Port and path configuration.

**Returns:** A Docker Compose YAML string.

### Constants

#### `provider`

Docker Compose staging driver implementation.

```typescript
const provider: StagingDriver
```

## Core Interface
Implements `@molecule/api-staging` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-staging'
import { provider } from '@molecule/api-staging-docker-compose'

export function setupStagingDockerCompose(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-staging` ^1.0.0

- Requires Docker Compose v2.24+ and BuildKit: the generated compose file
  uses long-syntax `env_file` (`required: false` — a project without `.env`
  or `.env.staging` must still stage) and a named `additional_contexts`
  build context (the generated `nginx.conf` lives in `.molecule/staging/`,
  outside the app build context).
- Inside the containers the API always listens on port 4000 and Postgres on
  5432; the allocated `driverMeta` ports (`apiPort`, `appPort`, `dbPort`)
  are HOST-side mappings only. The branch env file
  (`.env.staging.<slug>`) intentionally holds the host-side values for
  tooling run outside Docker — the compose `environment:` block overrides
  `PORT`/`DATABASE_URL` back to the in-container values.
- `health()` reports container state (`running`), not HTTP reachability —
  a booted-but-crashing app can still need `logs()` to diagnose.
- Environments live on the machine that ran `up()` (containers + state are
  local) — running this driver on an ephemeral CI runner produces an
  environment that dies with the job.
