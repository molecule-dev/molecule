# @molecule/app-kanban

Kanban board core interface for molecule.dev.

Provides a framework-agnostic contract for kanban boards with columns,
cards, drag-to-move, column reordering, WIP limits, and subscription-based
state notifications. Bond a provider (e.g. `@molecule/app-kanban-default`)
at startup, then use {@link createBoard} anywhere.

## Quick Start

```typescript
import { setProvider, createBoard } from '@molecule/app-kanban'
import { provider } from '@molecule/app-kanban-default'

setProvider(provider)

const board = createBoard({
  columns: [
    { id: 'todo', title: 'To Do', cards: [] },
    { id: 'in-progress', title: 'In Progress', cards: [], limit: 3 },
    { id: 'done', title: 'Done', cards: [] },
  ],
  onCardMove: (cardId, from, to, pos) => {
    api.post('/cards/move', { cardId, from, to, pos })
  },
})

board.onUpdate((state) => {
  console.log('Columns:', state.columns.length)
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-kanban
```

## API

### Interfaces

#### `CardMoveEvent`

Payload emitted when a card is moved between or within columns.

```typescript
interface CardMoveEvent {
  /** Identifier of the moved card. */
  cardId: string
  /** Identifier of the source column. */
  fromColumnId: string
  /** Identifier of the destination column. */
  toColumnId: string
  /** Zero-based insertion position in the destination column. */
  position: number
}
```

#### `ColumnReorderEvent`

Payload emitted when columns are reordered.

```typescript
interface ColumnReorderEvent {
  /** New ordered list of column identifiers. */
  columnIds: string[]
}
```

#### `KanbanCard`

A single card on a kanban board.

```typescript
interface KanbanCard<T = unknown> {
  /** Unique identifier for the card. */
  id: string
  /** Application-specific data payload. */
  data: T
}
```

#### `KanbanColumn`

A column (lane) on a kanban board.

```typescript
interface KanbanColumn<T = unknown> {
  /** Unique identifier for the column. */
  id: string
  /** Display title (should already be passed through i18n by the caller). */
  title: string
  /** Ordered list of cards in this column. */
  cards: KanbanCard<T>[]
  /** Optional work-in-progress limit. `undefined` means unlimited. */
  limit?: number
  /** Optional colour token for the column header. */
  color?: string
}
```

#### `KanbanInstance`

A live kanban board instance exposing query, mutation, and subscription
methods.

```typescript
interface KanbanInstance<T = unknown> {
  // -- Query ---------------------------------------------------------------

  /**
   * Returns all columns in their current display order.
   *
   * @returns Array of columns.
   */
  getColumns(): KanbanColumn<T>[]

  /**
   * Returns a single column by its identifier.
   *
   * @param columnId - The column identifier.
   * @returns The column, or `undefined` if not found.
   */
  getColumn(columnId: string): KanbanColumn<T> | undefined

  /**
   * Returns a single card by its identifier, searching all columns.
   *
   * @param cardId - The card identifier.
   * @returns The card and its column id, or `undefined` if not found.
   */
  findCard(cardId: string): { card: KanbanCard<T>; columnId: string } | undefined

  // -- Card mutations ------------------------------------------------------

  /**
   * Adds a card to a column.
   *
   * @param columnId - Target column identifier.
   * @param card - The card to add.
   * @param position - Zero-based insertion position. Defaults to end.
   */
  addCard(columnId: string, card: KanbanCard<T>, position?: number): void

  /**
   * Removes a card from the board.
   *
   * @param cardId - Identifier of the card to remove.
   */
  removeCard(cardId: string): void

  /**
   * Moves a card to a column at a given position.
   *
   * @param cardId - Identifier of the card to move.
   * @param toColumnId - Destination column identifier.
   * @param position - Zero-based insertion position.
   */
  moveCard(cardId: string, toColumnId: string, position: number): void

  /**
   * Updates the data payload of an existing card.
   *
   * @param cardId - Identifier of the card to update.
   * @param data - New data payload.
   */
  updateCard(cardId: string, data: T): void

  // -- Column mutations ----------------------------------------------------

  /**
   * Adds a new column to the board.
   *
   * @param column - The column to add.
   * @param position - Zero-based insertion position. Defaults to end.
   */
  addColumn(column: KanbanColumn<T>, position?: number): void

  /**
   * Removes a column and all its cards from the board.
   *
   * @param columnId - Identifier of the column to remove.
   */
  removeColumn(columnId: string): void

  /**
   * Reorders columns to match the given id sequence.
   *
   * @param columnIds - Ordered list of column identifiers.
   */
  reorderColumns(columnIds: string[]): void

  /**
   * Updates the title, limit, or color of an existing column.
   *
   * @param columnId - Identifier of the column to update.
   * @param updates - Partial column properties to merge.
   */
  updateColumn(
    columnId: string,
    updates: Partial<Pick<KanbanColumn<T>, 'title' | 'limit' | 'color'>>,
  ): void

  // -- Drag state ----------------------------------------------------------

  /**
   * Sets the actively dragged card identifier (used by framework bindings).
   *
   * @param cardId - Card identifier, or `null` to clear.
   */
  setActiveCard(cardId: string | null): void

  /**
   * Sets the actively dragged column identifier (used by framework bindings).
   *
   * @param columnId - Column identifier, or `null` to clear.
   */
  setActiveColumn(columnId: string | null): void

  // -- Subscriptions -------------------------------------------------------

  /**
   * Registers a handler that fires when the board state changes.
   *
   * @param handler - The update handler.
   */
  onUpdate(handler: KanbanUpdateHandler<T>): void

  /**
   * Removes a previously registered update handler.
   *
   * @param handler - The handler to remove.
   */
  offUpdate(handler: KanbanUpdateHandler<T>): void

  // -- Lifecycle -----------------------------------------------------------

  /**
   * Returns the current state snapshot.
   *
   * @returns The current {@link KanbanState}.
   */
  getState(): KanbanState<T>

  /**
   * Releases resources held by the kanban board instance.
   */
  destroy(): void
}
```

#### `KanbanOptions`

Configuration for creating a kanban board instance.

```typescript
interface KanbanOptions<T = unknown> {
  /** Initial columns (with their cards) for the board. */
  columns: KanbanColumn<T>[]

  /**
   * Called when a card is moved between or within columns.
   *
   * @param cardId - Identifier of the moved card.
   * @param fromColumnId - Source column identifier.
   * @param toColumnId - Destination column identifier.
   * @param position - Zero-based insertion position.
   */
  onCardMove: (cardId: string, fromColumnId: string, toColumnId: string, position: number) => void

  /**
   * Called when columns are reordered. If not provided, column reordering
   * is disabled.
   *
   * @param columnIds - New ordered list of column identifiers.
   */
  onColumnReorder?: (columnIds: string[]) => void
}
```

#### `KanbanProvider`

Contract that bond packages must implement to provide kanban board
functionality.

```typescript
interface KanbanProvider {
  /**
   * Creates a new kanban board instance from the given options.
   *
   * @template T - Application-specific card data type.
   * @param options - Kanban board configuration.
   * @returns A kanban board instance.
   */
  createBoard<T = unknown>(options: KanbanOptions<T>): KanbanInstance<T>
}
```

#### `KanbanState`

Snapshot of the kanban board state, emitted to subscribers on change.

```typescript
interface KanbanState<T = unknown> {
  /** Current list of columns in display order. */
  columns: KanbanColumn<T>[]
  /** Identifier of the card currently being dragged, or `null`. */
  activeCardId: string | null
  /** Identifier of the column currently being dragged, or `null`. */
  activeColumnId: string | null
}
```

### Types

#### `KanbanUpdateHandler`

Handler invoked when the kanban board state changes.

```typescript
type KanbanUpdateHandler<T = unknown> = (state: KanbanState<T>) => void
```

### Functions

#### `createBoard(options)`

Creates a kanban board instance using the bonded provider.

```typescript
function createBoard(options: KanbanOptions<T>): KanbanInstance<T>
```

- `options` — Kanban board configuration.

**Returns:** A kanban board instance.

#### `getProvider()`

Retrieves the bonded kanban provider, throwing if none is configured.

```typescript
function getProvider(): KanbanProvider
```

**Returns:** The bonded kanban provider.

#### `hasProvider()`

Checks whether a kanban provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a kanban provider is bonded.

#### `setProvider(provider)`

Registers a kanban provider as the active singleton. Called by bond
packages (e.g. `@molecule/app-kanban-default`) during app startup.

```typescript
function setProvider(provider: KanbanProvider): void
```

- `provider` — The kanban provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
