# @molecule/app-kanban-default

Default kanban provider for molecule.dev.

Provides an in-memory kanban board implementation with column/card CRUD,
drag state tracking, column reordering, and subscription-based state
notifications. No external dependencies.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-kanban-default
```

## Usage

```typescript
import { setProvider } from '@molecule/app-kanban'
import { provider } from '@molecule/app-kanban-default'

setProvider(provider)
```

## API

### Interfaces

#### `DefaultKanbanConfig`

Provider-specific configuration for the default kanban provider.

```typescript
interface DefaultKanbanConfig {
  /**
   * Whether to deep-clone card data when returning snapshots.
   * When `false` (default), card `data` fields are returned by reference for
   * performance. Set to `true` if consumers may mutate returned card data and
   * you need snapshot isolation.
   *
   * Defaults to `false`.
   */
  cloneCardData?: boolean
}
```

### Functions

#### `createDefaultProvider(_config)`

Creates a default kanban provider.

```typescript
function createDefaultProvider(_config?: DefaultKanbanConfig): KanbanProvider
```

- `_config` — Optional provider-specific configuration.

**Returns:** A `KanbanProvider` backed by in-memory state management.

### Constants

#### `provider`

Default kanban provider instance.

```typescript
const provider: KanbanProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-kanban` >=1.0.0
