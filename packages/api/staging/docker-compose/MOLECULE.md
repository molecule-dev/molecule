# @molecule/api-staging-docker-compose

Docker Compose staging driver for molecule.dev.

Manages ephemeral staging environments using Docker Compose.
Each feature branch gets isolated API, App, and database containers
with unique port allocations and networking.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-staging-docker-compose
```

## Usage

```typescript
import { setProvider } from '@molecule/api-staging'
import { provider } from '@molecule/api-staging-docker-compose'

setProvider(provider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-staging` ^1.0.0
