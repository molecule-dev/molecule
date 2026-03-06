# @molecule/app-ide-default

Default IDE workspace provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ide-default
```

## API

### Interfaces

#### `DefaultWorkspaceConfig`

Configuration for default workspace.

```typescript
interface DefaultWorkspaceConfig {
  /** Default panel layout. */
  defaultLayout?: WorkspaceLayout
  /** Persist layout using the provided storage adapter. */
  persistLayout?: boolean
  /** Key for storage persistence. */
  storageKey?: string
  /** Storage adapter for persistence. Required when persistLayout is true. */
  storage?: StorageAdapter
}
```

#### `StorageAdapter`

Adapter interface for storage.

```typescript
interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
```

### Classes

#### `DefaultWorkspaceProvider`

Default implementation of `WorkspaceProvider`. Manages panel layout (chat, editor, preview),
sizes, visibility, collapse state, and optional persistence via a storage adapter.

### Functions

#### `createProvider(config)`

Creates a `DefaultWorkspaceProvider` with optional layout configuration and persistence.

```typescript
function createProvider(config?: DefaultWorkspaceConfig): DefaultWorkspaceProvider
```

- `config` — Workspace configuration (default layout, persistence options, storage adapter).

**Returns:** A `DefaultWorkspaceProvider` that manages panel layout state.

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: DefaultWorkspaceProvider
```

## Core Interface
Implements `@molecule/app-ide` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-ide'
import { provider } from '@molecule/app-ide-default'

export function setupIdeDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ide` ^1.0.0
