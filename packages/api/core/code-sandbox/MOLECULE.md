# @molecule/api-code-sandbox

Code sandbox core interface for molecule.dev.

Defines the `SandboxProvider` contract for provisioning isolated execution
environments (`create`/`get`/`list`/`destroy`, optional named-volume
management) and the `Sandbox` handle each returns: lifecycle
(`start`/`stop`/`sleep`/`wake`), `exec`, file I/O, `getPreviewUrl`, and file
watching. Interface-only: bond a provider (e.g.
`@molecule/api-code-sandbox-docker`) at startup; consumers stay
provider-agnostic.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-code-sandbox'
import { provider as docker } from '@molecule/api-code-sandbox-docker'

setProvider(docker) // at startup

const sandbox = await requireProvider().create({ projectId: project.id })
const result = await sandbox.exec('npm test', { timeout: 120_000 })
if (result.exitCode !== 0) console.error(result.stderr)
await sandbox.writeFile('notes/README.md', '# Hello')
const url = sandbox.getPreviewUrl(5173) // proxy/iframe target for the running app
await requireProvider().destroy(sandbox.id)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-code-sandbox @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `DirEntry`

Directory entry from readDir.

```typescript
interface DirEntry {
  name: string
  type: 'file' | 'directory'
  size?: number
  /** If this entry is a symlink, the target path it points to. */
  symlinkTarget?: string
}
```

#### `ExecOptions`

Options for command execution.

```typescript
interface ExecOptions {
  cwd?: string
  timeout?: number
  env?: Record<string, string>
}
```

#### `ExecResult`

Result of executing a command in a sandbox.

```typescript
interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}
```

#### `FileChangeEvent`

File change event from watching.

```typescript
interface FileChangeEvent {
  type: 'create' | 'modify' | 'delete'
  path: string
}
```

#### `Sandbox`

A running sandbox instance.

```typescript
interface Sandbox {
  id: string
  status: 'creating' | 'running' | 'sleeping' | 'stopped'
  previewUrl: string

  start(): Promise<void>
  stop(): Promise<void>
  sleep(): Promise<void>
  wake(): Promise<void>

  exec(command: string, opts?: ExecOptions): Promise<ExecResult>

  /** Spawn a persistent process with streaming I/O. Optional — not all providers support this. */
  spawn?(command: string, opts?: ExecOptions): Promise<SpawnHandle>

  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  /** List a directory. THROWS when the path does not exist — an empty array means "exists and is empty", never "missing". */
  readDir(path: string): Promise<DirEntry[]>
  deleteFile(path: string): Promise<void>

  getPreviewUrl(port?: number): string
  onFileChange(cb: (event: FileChangeEvent) => void): () => void
}
```

#### `SandboxConfig`

Configuration for creating a new sandbox.

```typescript
interface SandboxConfig {
  projectId: string
  image?: string
  env?: Record<string, string>
  /** Docker volume name to mount at /sandbox/project for persistent storage. */
  volumeName?: string
  /**
   * Extra provider-level labels merged into the container's labels (additive;
   * does not replace the provider's own `managed`/`projectId`/`volumeName`
   * labels). Lets callers tag containers for out-of-band recovery — e.g. a
   * production runtime applying `molecule.production=<projectId>` so its
   * long-lived containers are distinguishable from dev sandboxes and
   * recoverable across control-plane restarts.
   */
  labels?: Record<string, string>
  resources?: {
    cpu: number
    memoryMB: number
    diskMB: number
  }
}
```

#### `SandboxProvider`

Sandbox provider interface.

Each bond package (Docker, Firecracker, etc.) implements
this interface to manage sandbox lifecycle.

```typescript
interface SandboxProvider {
  readonly name: string

  create(config: SandboxConfig): Promise<Sandbox>
  get(id: string): Promise<Sandbox | null>
  list(userId: string): Promise<Sandbox[]>
  destroy(id: string): Promise<void>

  /** Create a named volume for persistent sandbox storage. Optional — not all providers support volumes. */
  createVolume?(name: string): Promise<void>
  /** Remove a named volume. Optional. */
  removeVolume?(name: string): Promise<void>
  /** Check if a named volume exists. Optional. */
  volumeExists?(name: string): Promise<boolean>
}
```

#### `SpawnHandle`

Handle to a spawned long-running process with streaming I/O.

```typescript
interface SpawnHandle {
  /** Write data to the process's stdin. */
  write(data: string): void
  /** Register a callback for stdout data. */
  onStdout(cb: (data: string) => void): void
  /** Register a callback for stderr data. */
  onStderr(cb: (data: string) => void): void
  /** Register a callback for when the process exits. */
  onClose(cb: () => void): void
  /** Kill the spawned process. */
  kill(): void
}
```

### Functions

#### `getProvider()`

Retrieves the bonded sandbox provider, or `null` if none is bonded.

```typescript
function getProvider(): SandboxProvider | null
```

**Returns:** The bonded sandbox provider, or `null`.

#### `hasProvider()`

Checks whether a sandbox provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a sandbox provider is bonded.

#### `requireProvider()`

Retrieves the bonded sandbox provider, throwing if none is configured.

```typescript
function requireProvider(): SandboxProvider
```

**Returns:** The bonded sandbox provider.

#### `setProvider(provider)`

Registers a sandbox provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: SandboxProvider): void
```

- `provider` — The sandbox provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Docker | `@molecule/api-code-sandbox-docker` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **Treat everything inside a sandbox as untrusted.** Files and exec output are
  user/model-controlled: never eval them on the host, always cap `exec` with
  `timeout`, and pass secrets in via `env` only when the workload truly needs
  them.
- **`Sandbox` handles are not durable.** Persist your `projectId` → sandbox `id`
  mapping and re-`get(id)` after restarts. Files that must outlive the container
  need a named volume (`createVolume` + `SandboxConfig.volumeName`) — the volume
  APIs are optional, so feature-detect (`if (provider.createVolume)`).
- **`exec` returns a result, it doesn't throw on failure.** A non-zero
  `exitCode` is data — check it and read `stderr`. Long-running processes (dev
  servers) need `spawn` (optional — feature-detect), not `exec`.
- **`readDir()` THROWS when the path doesn't exist** — an empty array means
  "exists and is empty", never "missing".
- Wire with `setProvider(provider)` (or `bond('code-sandbox', provider)` — this
  core reads the bond registry).

## Translations

Translation strings are provided by `@molecule/api-locales-code-sandbox`.
