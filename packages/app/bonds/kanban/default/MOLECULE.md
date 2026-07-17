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
   * Whether to deep-clone card `data` when returning snapshots.
   * When `false` (default), card `data` fields are returned by reference for
   * performance. Set to `true` to deep-clone (via `structuredClone`) each
   * card's `data` in every returned snapshot — `getColumns`, `getColumn`,
   * `findCard`, `getState`, and `onUpdate` — so consumers may mutate returned
   * card data without affecting internal board state.
   *
   * Defaults to `false`.
   */
  cloneCardData?: boolean
}
```

### Functions

#### `createDefaultProvider(config)`

Creates a default kanban provider.

```typescript
function createDefaultProvider(config?: DefaultKanbanConfig): KanbanProvider
```

- `config` — Optional provider-specific configuration. Set

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
- **`DefaultKanbanConfig.cloneCardData`** controls snapshot isolation of card
  `data`. Default `false` returns `data` by reference (columns/cards are
  shallow-cloned) for performance. Set it `true` to deep-clone each card's
  `data` (via `structuredClone`) in every returned snapshot
  (`getColumns`/`getColumn`/`findCard`/`getState`/`onUpdate`), so callers can
  mutate returned data without touching board state.
- `destroy()` clears the board and detaches all subscribers; instances are
  independent (`createBoard` per board).

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The board renders every column with its cards in order, and each
  column's card count matches the cards actually shown beneath it.
- [ ] Dragging a card onto a DIFFERENT column moves it there and it persists:
  after a full reload the card stays in the new column — proving the move
  fired the change callback (onCardMove) and the app SAVED it, not just
  shuffled local state.
- [ ] Dragging a card WITHIN a column to a new spot changes its order, and
  that new position survives a reload.
- [ ] Adding a card through the app's flow drops it into the target column,
  editing a card updates its content in place, and deleting removes it — each
  change sticking after reload.
- [ ] An empty column is a valid drop target: a card dragged onto it lands
  there and both columns' counts update correctly.
- [ ] If the app defines WIP limits, a column already at its limit visibly
  flags or rejects an over-limit drop (the core stores `limit` but does not
  enforce it — the app must), so a column's count never silently exceeds it.
