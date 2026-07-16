# @molecule/app-kanban-default

Default kanban provider for molecule.dev.

Provides an in-memory kanban board implementation with column/card CRUD,
drag state tracking, column reordering, and subscription-based state
notifications. No external dependencies.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-kanban'
import { provider } from '@molecule/app-kanban-default'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-kanban-default @molecule/app-kanban
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

## Core Interface
Implements `@molecule/app-kanban` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-kanban'
import { provider } from '@molecule/app-kanban-default'

export function setupKanbanDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-kanban` >=1.0.0

### Runtime Dependencies

- `@molecule/app-kanban`

- **Headless state container** — no DOM and no drag-and-drop UI. Your app
  renders columns/cards (ClassMap + `t()`) and translates its own drag
  events into `moveCard`/`addCard`/`reorderColumns`; subscribe with
  `onUpdate` to re-render.
- `KanbanOptions.onCardMove` is required and fires on every `moveCard` —
  persist the move there.
- **`DefaultKanbanConfig.cloneCardData` is currently INERT** — the provider
  never reads it; card `data` is always returned by reference (columns/cards
  arrays are shallow-cloned). Do not rely on snapshot isolation of `data`.
- `destroy()` clears the board and detaches all subscribers; instances are
  independent (`createBoard` per board).
