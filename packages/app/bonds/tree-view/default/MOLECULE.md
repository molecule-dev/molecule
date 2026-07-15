# @molecule/app-tree-view-default

Default provider for \@molecule/app-tree-view.

Provides an in-memory tree view implementation with node management,
selection, and expansion control.

## Quick Start

```typescript
import { provider } from '@molecule/app-tree-view-default'
import { setProvider } from '@molecule/app-tree-view'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-tree-view-default @molecule/app-tree-view
```

## API

### Interfaces

#### `DefaultTreeViewConfig`

Provider-specific configuration options.

```typescript
interface DefaultTreeViewConfig {
  /** Whether to expand all nodes by default. Defaults to `false`. */
  expandAll?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a default tree view provider.

```typescript
function createProvider(config?: DefaultTreeViewConfig): TreeViewProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured TreeViewProvider.

### Constants

#### `provider`

Default tree view provider instance.

```typescript
const provider: TreeViewProvider
```

## Core Interface
Implements `@molecule/app-tree-view` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-tree-view'
import { provider } from '@molecule/app-tree-view-default'

export function setupTreeViewDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-tree-view` ^1.0.0

### Runtime Dependencies

- `@molecule/app-tree-view`
