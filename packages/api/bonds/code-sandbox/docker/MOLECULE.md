# @molecule/api-code-sandbox-docker

Docker code-sandbox provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-code-sandbox-docker @molecule/api-bond @molecule/api-code-sandbox @molecule/api-i18n
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
  /** Docker unix-socket path. Defaults to /var/run/docker.sock (or DOCKER_SOCKET_PATH). The only supported daemon transport — remote TCP daemons are not supported. */
  socketPath?: string
  /** NOT IMPLEMENTED — reserved. The provider always connects via the unix socket; this field is ignored. */
  host?: string
  /** NOT IMPLEMENTED — reserved. Ignored; see `host`. */
  port?: number
  /** Base image for sandbox containers. Defaults to node:22-slim. Must already be present on the host — the provider never pulls images. */
  baseImage?: string
  /** Default CPU allocation (cores). */
  defaultCpu?: number
  /** Default memory allocation (MB). */
  defaultMemoryMB?: number
  /** NOT IMPLEMENTED — no disk quota is applied to sandbox containers; this field is ignored. */
  defaultDiskMB?: number
  /** IGNORED — the sandbox network is controlled exclusively by the SANDBOX_DOCKER_NETWORK env var (default molecule-sandbox, auto-created with ICC disabled). */
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

#### `withTransientRetry(op, opts, opts, opts, opts, opts, opts)`

Retry a Docker API operation that failed with a TRANSIENT fault — a request
timeout or a connection-level reset, i.e. the daemon was momentarily overwhelmed,
not the request malformed. This is the fix for the observed "first cold boot of a
concurrent batch dies on `Docker API timeout: POST /containers/create`" failure:
a single 30 s create timeout under daemon load currently kills the whole boot.

HTTP error responses (4xx/5xx) are deliberately NOT retried — those are real
answers (no-such-image, name conflict), not transient network faults. Bounded
attempts with linear backoff.

`onRetry` is the idempotency guard: a create that TIMED OUT client-side may have
still succeeded server-side, so before re-issuing it the caller can adopt the
already-created resource (looked up by a unique label) instead of leaking a
duplicate container. If `onRetry` returns non-null, that value is used and the
operation is not re-issued.

```typescript
function withTransientRetry(op: () => Promise<T>, opts: { label: string; attempts?: number; onRetry?: () => Promise<T | null>; delayMs?: (attempt: number) => number; log?: { warn: (message: string, meta?: unknown) => void; }; }): Promise<T>
```

- `op` — the operation to attempt.
- `opts` — tuning + the optional adopt-on-retry guard.
- `opts` — .label - short operation name for log lines.
- `opts` — .attempts - max attempts (default 3).
- `opts` — .onRetry - adopt-an-existing-resource guard, run before each retry.
- `opts` — .delayMs - backoff for attempt N (default `400 * N` ms).
- `opts` — .log - optional logger for retry warnings.

**Returns:** the operation's result, or an adopted result from `onRetry`.

### Constants

#### `provider`

The provider implementation.

```typescript
const provider: SandboxProvider
```

## Core Interface
Implements `@molecule/api-code-sandbox` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-code-sandbox'
import { provider } from '@molecule/api-code-sandbox-docker'

export function setupCodeSandboxDocker(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-code-sandbox` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-code-sandbox`
- `@molecule/api-i18n`

**Tenant network isolation (secure default).** Each sandbox is placed on a dedicated
user-defined Docker network created with inter-container communication DISABLED
(`com.docker.network.bridge.enable_icc=false`), so one tenant's sandbox cannot reach another
tenant's Vite/API dev-server ports by IP. Do NOT set `SANDBOX_DOCKER_NETWORK="bridge"` — the
shared docker bridge has ICC enabled (no cross-tenant isolation) and is REFUSED in production.
Override `SANDBOX_DOCKER_NETWORK` only to point at another dedicated ICC-off network. This is
an L2 isolation control; pair it with host-layer default-deny egress filtering (operator-
provisioned) for full isolation. [C1-1]

**Prerequisites.** A Docker daemon reachable at `DOCKER_SOCKET_PATH`
(default `/var/run/docker.sock`) — remote TCP daemons are not supported —
and the base image (default `node:22-slim`, or `config.baseImage`) already
pulled on the host: the provider never pulls images, so `create()` fails
with a no-such-image error otherwise. The isolated sandbox network is
auto-created on first use; it is NOT a prerequisite.

## Translations

Translation strings are provided by `@molecule/api-locales-code-sandbox-docker`.
