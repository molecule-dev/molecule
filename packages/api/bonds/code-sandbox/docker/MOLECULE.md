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
  /**
   * Docker unix-socket path. Defaults to `/var/run/docker.sock` (or the
   * `DOCKER_SOCKET_PATH` env var). This is the default transport; it is ignored
   * when a TCP endpoint is selected via `host`/`port` or a `tcp://` `DOCKER_HOST`.
   */
  socketPath?: string
  /**
   * Connect to a remote/TCP Docker daemon at this host instead of the unix
   * socket. When set, the provider issues all Docker Engine API calls over
   * plain TCP to `host:port` (`port` defaults to 2375) and `socketPath` is
   * ignored. Also honored via `DOCKER_HOST` (`tcp://host:port`). Plain
   * (unencrypted) TCP only — for a TLS-protected daemon (2376) front it with a
   * local socket proxy and point `socketPath` at that.
   */
  host?: string
  /** TCP port for `host` (default 2375). Ignored unless `host` (or a `tcp://` `DOCKER_HOST`) selects a TCP endpoint. */
  port?: number
  /** Base image for sandbox containers. Defaults to node:22-slim. Must already be present on the host — the provider never pulls images. */
  baseImage?: string
  /** Default CPU allocation (cores). */
  defaultCpu?: number
  /** Default memory allocation (MB). */
  defaultMemoryMB?: number
  /**
   * Docker network the sandbox containers attach to (sets each container's
   * `NetworkMode`). Overrides the `SANDBOX_DOCKER_NETWORK` env var. Defaults to
   * the ICC-off isolated `molecule-sandbox` network, auto-created on first use so
   * tenants are L2-isolated by default. Setting it to the shared `bridge` gives NO
   * cross-tenant isolation and is refused in production. [C1-1]
   */
  network?: string
  /** Container label prefix for identification. */
  labelPrefix?: string
  /** Preview URL template. Use {port} placeholder. */
  previewUrlTemplate?: string
}
```

#### `ProcessEnv`

Environment variables the Docker sandbox provider reads.

```typescript
interface ProcessEnv {
  /** Unix-socket path for the Docker daemon (default `/var/run/docker.sock`). Overridden by `config.socketPath`. */
  DOCKER_SOCKET_PATH?: string
  /** Docker daemon endpoint, docker-client style: `tcp://host:port` or `unix:///path/to/docker.sock`. Overridden by `config.host`/`config.socketPath`. */
  DOCKER_HOST?: string
  /** Docker network sandbox containers attach to (default `molecule-sandbox`, ICC-off). Overridden by `config.network`. [C1-1] */
  SANDBOX_DOCKER_NETWORK?: string
}
```

### Functions

#### `createProvider(config)`

Creates a new `DockerSandboxProvider` instance with the given configuration.

```typescript
function createProvider(config?: DockerConfig): SandboxProvider
```

- `config` — Optional Docker-specific configuration: daemon endpoint

**Returns:** A `SandboxProvider` that manages Docker containers as sandboxes.

#### `withTransientRetry(op, opts)`

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
- `opts.label` — short operation name for log lines.
- `opts.attempts` — max attempts (default 3).
- `opts.onRetry` — adopt-an-existing-resource guard, run before each retry.
- `opts.delayMs` — backoff for attempt N (default `400 * N` ms).
- `opts.log` — optional logger for retry warnings.

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

**Prerequisites.** A reachable Docker daemon and the base image already pulled
on the host. The daemon is reached over a unix socket by default
(`config.socketPath` ?? `DOCKER_SOCKET_PATH` ?? `/var/run/docker.sock`); a
remote or rootless daemon can be selected with `config.host`/`config.port` or a
`DOCKER_HOST` (`tcp://host:port` or `unix:///path`). Only PLAIN (unencrypted)
TCP is supported — front a TLS-protected daemon (2376) with a local socket
proxy. The provider never pulls images, so `create()` fails with a no-such-image
error if the base image (default `node:22-slim`, or `config.baseImage`) is
absent. The isolated sandbox network is auto-created on first use; it is NOT a
prerequisite.

**No per-sandbox disk quota.** The Docker API cannot portably cap a
container/volume size (it needs specific storage drivers — e.g. overlay2 on xfs
with `pquota` — and errors on the common overlay2/ext4 host), so this provider
enforces none. The core `resources.diskMB` is accepted but not applied here; cap
disk at the host / volume level instead.

## Translations

Translation strings are provided by `@molecule/api-locales-code-sandbox-docker`.
