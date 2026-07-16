# @molecule/app-drag-drop

Drag-and-drop core interface for molecule.dev.

Provides a framework-agnostic contract for sortable lists, draggable items,
and droppable zones. Bond a provider (e.g. `@molecule/app-drag-drop-dndkit`)
at startup, then use {@link createSortable}, {@link createDraggable}, or
{@link createDroppable} anywhere.

## Quick Start

```typescript
import { setProvider, createSortable } from '@molecule/app-drag-drop'
import { provider } from '@molecule/app-drag-drop-dndkit'

setProvider(provider)

const sortable = createSortable({
  items: [{ id: '1' }, { id: '2' }, { id: '3' }],
  axis: 'vertical',
  onReorder: (items) => console.log('New order:', items),
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-drag-drop @molecule/app-bond
```

## API

### Interfaces

#### `DragDropContextOptions`

Configuration for the top-level drag-and-drop context.

```typescript
interface DragDropContextOptions {
  /** Called when a drag operation starts. */
  onDragStart?: (event: DragStartEvent) => void
  /** Called while dragging — when the item moves over a new target. */
  onDragOver?: (event: DragOverEvent) => void
  /** Called when the drag operation ends (drop or cancel). */
  onDragEnd?: (event: DragEndEvent) => void
  /** Called on every move tick during a drag (optional, high-frequency). */
  onDragMove?: (event: DragMoveEvent) => void
}
```

#### `DragDropProvider`

Contract that bond packages must implement to provide drag-and-drop
functionality.

```typescript
interface DragDropProvider {
  /**
   * Creates a sortable container from the given options.
   *
   * @template T - The item type.
   * @param options - Sortable configuration.
   * @returns A sortable container instance.
   */
  createSortable<T extends { id: string }>(options: SortableOptions<T>): SortableInstance<T>

  /**
   * Creates a draggable item from the given options.
   *
   * @param options - Draggable configuration.
   * @returns A draggable instance.
   */
  createDraggable(options: DraggableOptions): DraggableInstance

  /**
   * Creates a droppable zone from the given options.
   *
   * @param options - Droppable configuration.
   * @returns A droppable instance.
   */
  createDroppable(options: DroppableOptions): DroppableInstance
}
```

#### `DragEndEvent`

Payload emitted when a drag operation ends (drop or cancel).

```typescript
interface DragEndEvent {
  /** Identifier of the dragged item. */
  id: string
  /** Identifier of the item or zone the item was dropped onto, if any. */
  overId?: string
  /** Arbitrary data attached to the dragged item. */
  data?: unknown
}
```

#### `DraggableInstance`

A live draggable instance bound to a single element.

```typescript
interface DraggableInstance {
  /** Returns the identifier of this draggable. */
  getId(): string

  /** Returns `true` while this draggable is actively being dragged. */
  isDragging(): boolean

  /**
   * Enables or disables dragging for this item.
   *
   * @param disabled - Whether to disable.
   */
  setDisabled(disabled: boolean): void

  /**
   * Updates the data payload.
   *
   * @param data - New data payload.
   */
  setData(data: unknown): void

  /** Releases resources. */
  destroy(): void
}
```

#### `DraggableOptions`

Configuration for creating a draggable item.

```typescript
interface DraggableOptions {
  /** Unique identifier for the draggable item. */
  id: string
  /** Arbitrary data payload carried with the drag. */
  data?: unknown
  /** Whether dragging is disabled for this item. Defaults to `false`. */
  disabled?: boolean
}
```

#### `DragMoveEvent`

Payload emitted while the user is dragging (move / over events).

```typescript
interface DragMoveEvent {
  /** Identifier of the dragged item. */
  id: string
  /** Identifier of the item or zone currently hovered over, if any. */
  overId?: string
  /** Arbitrary data attached to the dragged item. */
  data?: unknown
}
```

#### `DragOverEvent`

Payload emitted when a draggable enters a droppable zone.

```typescript
interface DragOverEvent {
  /** Identifier of the dragged item. */
  id: string
  /** Identifier of the droppable zone being hovered. */
  overId: string
  /** Arbitrary data attached to the dragged item. */
  data?: unknown
}
```

#### `DragStartEvent`

Payload emitted when a drag operation starts.

```typescript
interface DragStartEvent {
  /** Identifier of the dragged item. */
  id: string
  /** Arbitrary data attached to the dragged item. */
  data?: unknown
}
```

#### `DroppableInstance`

A live droppable zone instance.

```typescript
interface DroppableInstance {
  /** Returns the identifier of this droppable zone. */
  getId(): string

  /** Returns `true` while a draggable is hovering over this zone. */
  isOver(): boolean

  /**
   * Enables or disables this droppable zone.
   *
   * @param disabled - Whether to disable.
   */
  setDisabled(disabled: boolean): void

  /** Releases resources. */
  destroy(): void
}
```

#### `DroppableOptions`

Configuration for creating a droppable zone.

```typescript
interface DroppableOptions {
  /** Unique identifier for the droppable zone. */
  id: string
  /** List of draggable type identifiers this zone accepts. `undefined` accepts all. */
  accept?: string[]
  /**
   * Called when a draggable is dropped onto this zone.
   *
   * @param data - The data payload from the dropped draggable.
   * @param draggableId - The identifier of the dropped draggable.
   */
  onDrop: (data: unknown, draggableId: string) => void
  /** Whether this droppable zone is disabled. Defaults to `false`. */
  disabled?: boolean
}
```

#### `SortableInstance`

A live sortable container instance.

```typescript
interface SortableInstance<T extends { id: string }> {
  /** Returns the items in their current order. */
  getItems(): T[]

  /**
   * Replaces the item list (e.g. after external data changes).
   *
   * @param items - The new item list.
   */
  setItems(items: T[]): void

  /** Returns the id of the item currently being dragged, or `null`. */
  getActiveId(): string | null

  /**
   * Enables or disables drag interactions.
   *
   * @param disabled - Whether to disable.
   */
  setDisabled(disabled: boolean): void

  /** Releases resources held by the sortable instance. */
  destroy(): void
}
```

#### `SortableOptions`

Configuration for creating a sortable container.

```typescript
interface SortableOptions<T extends { id: string }> {
  /** Ordered list of sortable items. Each must have a string `id` property. */
  items: T[]
  /** Sort axis. Defaults to `'vertical'`. */
  axis?: SortableAxis
  /**
   * Called when the user finishes reordering. Receives the new item order.
   *
   * @param items - The reordered items.
   */
  onReorder: (items: T[]) => void
  /** Whether dragging is restricted to a drag handle element. Defaults to `false`. */
  handle?: boolean
  /** Disable all drag interactions. Defaults to `false`. */
  disabled?: boolean
  /**
   * Strategy for detecting drop positions. If omitted the provider selects
   * a strategy based on the axis.
   */
  strategy?: SortableStrategy
}
```

### Types

#### `SortableAxis`

Allowed sort axes for sortable containers.

```typescript
type SortableAxis = 'vertical' | 'horizontal' | 'both'
```

#### `SortableStrategy`

Strategy used to detect drop position within a sortable container.

```typescript
type SortableStrategy = 'vertical' | 'horizontal' | 'grid'
```

### Functions

#### `createDraggable(options)`

Creates a draggable item using the bonded provider.

```typescript
function createDraggable(options: DraggableOptions): DraggableInstance
```

- `options` — Draggable configuration.

**Returns:** A draggable instance.

#### `createDroppable(options)`

Creates a droppable zone using the bonded provider.

```typescript
function createDroppable(options: DroppableOptions): DroppableInstance
```

- `options` — Droppable configuration.

**Returns:** A droppable instance.

#### `createSortable(options)`

Creates a sortable container using the bonded provider.

```typescript
function createSortable(options: SortableOptions<T>): SortableInstance<T>
```

- `options` — Sortable configuration.

**Returns:** A sortable container instance.

#### `getProvider()`

Retrieves the bonded drag-drop provider, throwing if none is configured.

```typescript
function getProvider(): DragDropProvider
```

**Returns:** The bonded drag-drop provider.

#### `hasProvider()`

Checks whether a drag-drop provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a drag-drop provider is bonded.

#### `setProvider(provider)`

Registers a drag-drop provider as the active singleton. Called by bond
packages (e.g. `@molecule/app-drag-drop-dndkit`) during app startup.

```typescript
function setProvider(provider: DragDropProvider): void
```

- `provider` — The drag-drop provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Drag Drop | `@molecule/app-drag-drop-dndkit` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **The instance is a headless order store — no DOM listeners are attached.**
  Your UI owns the drag interaction: render the list (via `getClassMap()`/`cm.*`),
  wire your framework's drag events (HTML5 DnD / pointer events / a drag library
  binding), and drive the instance from them; `onReorder` fires with the new item
  array when a reorder completes. Provider bonds may expose framework-binding
  hooks (see the bond's own docs) for this wiring.
- Every item MUST have a stable string `id` — index-based keys break reordering.
- **Persist the new order from `onReorder`** (e.g. send the ordered ids to your
  API through the app's HTTP client); on failure, restore the previous order with
  `setItems()` so the UI never lies about saved state.
- After external data changes, push fresh data with `setItems()` — the instance
  does not observe your store.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual sortable lists / drop zones, and check every
box off one by one. A box you can't check is an integration bug to fix — not
a skip:
- [ ] Dragging an item to a new position REORDERS the list: the item lands in
  the drop slot, the surrounding items shift, and the rendered order now
  matches getItems() — reordering along the configured axis (a horizontal or
  grid list moves left/right, not just top/bottom). The instance is a headless
  order store, so a drag that visibly "does nothing" means the wiring is
  missing, not that the feature works.
- [ ] The reorder fires onReorder with the NEW item array and the app SAVES
  it: after a full reload the list keeps the new order (proving onReorder
  persisted it, not just shuffled local state). If the save fails, the UI
  restores the previous order via setItems() instead of lying about it.
- [ ] Dragging an item BETWEEN two containers moves it: it leaves the source
  list and appears in the target, BOTH lists update, and the target's onDrop
  fires identifying the item that moved (data + draggableId say which item
  went where) — the move survives a reload if the app persists it.
- [ ] A drop zone with `accept` set takes only the draggable types it lists
  and rejects the rest — a disallowed item does not land there and no onDrop
  fires for it.
- [ ] A disabled item can't be dragged: with `disabled: true` (on the item or
  the whole sortable) a drag attempt does nothing, the order is unchanged, and
  no reorder/drop callback fires.
- [ ] When `handle: true`, only the drag-handle element starts a drag —
  grabbing the item body anywhere else does not move it.
- [ ] Dropping outside any valid zone CANCELS: the item snaps back to its
  origin, the order is unchanged, and no callback claims a move — the item is
  never lost or left in limbo.
