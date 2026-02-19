# @molecule/api-code-sandbox

Code sandbox interface for molecule.dev.

Provides isolated container environments for running user projects.

## Type
`core`

## Installation
```bash
npm install @molecule/api-code-sandbox
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
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
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

## Translations

Translation strings are provided by `@molecule/api-locales-code-sandbox`.
