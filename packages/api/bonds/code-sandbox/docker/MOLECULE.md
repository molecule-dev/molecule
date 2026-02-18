# @molecule/api-code-sandbox-docker

Docker code-sandbox provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-code-sandbox-docker
```

## API

### Interfaces

#### `ContainerInfo`

Container Info interface.

```typescript
interface ContainerInfo {
  id: string
  name: string
  status: string
  ports: Array<{ host: number; container: number }>
}
```

#### `DockerConfig`

Configuration for docker.

```typescript
interface DockerConfig {
  /** Docker socket path. Defaults to /var/run/docker.sock. */
  socketPath?: string
  /** Docker host URL (alternative to socketPath). */
  host?: string
  /** Docker API port. */
  port?: number
  /** Base image for sandbox containers. */
  baseImage?: string
  /** Default CPU allocation (cores). */
  defaultCpu?: number
  /** Default memory allocation (MB). */
  defaultMemoryMB?: number
  /** Default disk allocation (MB). */
  defaultDiskMB?: number
  /** Network name for sandbox containers. */
  network?: string
  /** Container label prefix for identification. */
  labelPrefix?: string
  /** Preview URL template. Use {port} placeholder. */
  previewUrlTemplate?: string
}
```

#### `ProcessEnv`

Process Env interface.

```typescript
interface ProcessEnv {
  DOCKER_HOST?: string
  DOCKER_SOCKET_PATH?: string
}
```

### Functions

#### `createProvider(config)`

Creates a new `DockerSandboxProvider` instance with the given configuration.

```typescript
function createProvider(config?: DockerConfig): SandboxProvider
```

- `config` — Optional Docker-specific configuration (socket path, base image, resource defaults).

**Returns:** A `SandboxProvider` that manages Docker containers as sandboxes.

### Constants

#### `provider`

The provider implementation.

```typescript
const provider: SandboxProvider
```

## Core Interface
Implements `@molecule/api-code-sandbox` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-code-sandbox` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-code-sandbox-docker`.
