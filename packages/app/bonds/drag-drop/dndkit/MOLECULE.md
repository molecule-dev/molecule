# @molecule/app-drag-drop-dndkit

Real @dnd-kit drag-drop provider for molecule.dev.

Implements `DragDropProvider` from `@molecule/app-drag-drop` against
`@dnd-kit/*`. Two layers ship here:

1. An imperative order store ({@link provider} / {@link createDndKitProvider})
   — `createSortable`/`createDraggable`/`createDroppable` — whose reorders use

## Quick Start

```typescript
import { provider } from '@molecule/app-drag-drop-dndkit'
import { setProvider } from '@molecule/app-drag-drop'

setProvider(provider)
```

```tsx
import { SortableList, useSortableItem } from '@molecule/app-drag-drop-dndkit'

// Dropping a row calls onReorder(newOrder); Space + arrow keys reorder too.
<SortableList items={items} onReorder={setItems}>
  <ul>{items.map((item) => <Row key={item.id} item={item} />)}</ul>
</SortableList>
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-drag-drop-dndkit @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @molecule/app-drag-drop react react-dom
npm install -D @types/react
```

## API

### Interfaces

#### `DndKitConfig`

Configuration options for the dnd-kit drag-drop provider. `activationDelay`
and `activationDistance` are honored by the React binding's pointer sensor
(see `SortableList` / `createSortableSensors`).

```typescript
interface DndKitConfig {
  /**
   * Activation delay in milliseconds before a drag starts. A positive value
   * makes the pointer sensor use a delay+tolerance constraint — useful for
   * distinguishing between click/tap and drag on touch devices. Takes
   * precedence over `activationDistance`. Defaults to `0` (immediate).
   */
  activationDelay?: number

  /**
   * Distance in pixels a pointer must travel before a drag starts. A positive
   * value makes the pointer sensor use a distance constraint (ignored when
   * `activationDelay` is set). Defaults to `0` (immediate).
   */
  activationDistance?: number

  /**
   * Whether Escape cancels a drag. @dnd-kit's keyboard sensor cancels on Escape
   * by default, so this is effectively `true`. Defaults to `true`.
   */
  cancelOnEscape?: boolean
}
```

#### `DndKitDraggableInstance`

Extended draggable instance with internal methods for framework bindings.

```typescript
interface DndKitDraggableInstance extends DraggableInstance {
  /**
   * Sets the dragging state. Called by framework bindings.
   *
   * @param value - Whether the item is being dragged.
   */
  _setDragging(value: boolean): void

  /**
   * Returns the current data payload.
   *
   * @returns The data associated with this draggable.
   */
  _getData(): unknown

  /**
   * Returns whether dragging is disabled.
   *
   * @returns `true` if disabled.
   */
  _isDisabled(): boolean
}
```

#### `DndKitDroppableInstance`

Extended droppable instance with internal methods for framework bindings.

```typescript
interface DndKitDroppableInstance extends DroppableInstance {
  /**
   * Sets the hover state. Called by framework bindings.
   *
   * @param value - Whether a draggable is over this zone.
   */
  _setOver(value: boolean): void

  /**
   * Checks if this zone accepts a given type.
   *
   * @param type - The draggable type to check.
   * @returns `true` if the type is accepted.
   */
  _accepts(type?: string): boolean

  /**
   * Invokes the onDrop handler. Called by framework bindings on drop.
   *
   * @param data - The data payload from the dropped draggable.
   * @param draggableId - The identifier of the dropped draggable.
   */
  _handleDrop(data: unknown, draggableId: string): void

  /**
   * Returns whether the droppable is disabled.
   *
   * @returns `true` if disabled.
   */
  _isDisabled(): boolean
}
```

#### `DndKitSortableInstance`

Extended sortable instance with internal methods for framework bindings.

```typescript
interface DndKitSortableInstance<T extends { id: string }> extends SortableInstance<T> {
  /**
   * Sets the active drag id. Called by framework bindings when a drag starts.
   *
   * @param id - The id of the item being dragged, or `null` when drag ends.
   */
  _setActiveId(id: string | null): void

  /**
   * Completes a reorder from one index to another. Called by framework
   * bindings on drag end.
   *
   * @param fromIndex - The source index.
   * @param toIndex - The destination index.
   */
  _reorder(fromIndex: number, toIndex: number): void

  /**
   * Returns whether sorting is disabled.
   *
   * @returns `true` if disabled.
   */
  _isDisabled(): boolean
}
```

#### `SortableDragEndContext`

Inputs for {@link handleSortableDragEnd}.

```typescript
interface SortableDragEndContext<T extends { id: string }> {
  /** The current ordered items. */
  items: T[]
  /** Core reorder callback, invoked with the new order after a real move. */
  onReorder: (items: T[]) => void
  /** Whether sorting is disabled — suppresses the reorder. Defaults to `false`. */
  disabled?: boolean
  /** Optional passthrough of the core drag-end event. */
  onDragEnd?: (event: DragEndEvent) => void
}
```

#### `SortableItemState`

The wiring returned by {@link useSortableItem} for a single sortable row.

```typescript
interface SortableItemState {
  /** Ref for the row element (the sortable node). */
  setNodeRef: (node: HTMLElement | null) => void
  /** Ref for an optional drag handle — spread `listeners` on this element for handle-only dragging. */
  setActivatorNodeRef: (element: HTMLElement | null) => void
  /** Accessibility attributes (role/tabindex/aria) — spread onto the row for keyboard support. */
  attributes: DraggableAttributes
  /** Pointer/keyboard drag listeners — spread onto the row body or the handle. */
  listeners: DraggableSyntheticListeners
  /** Inline transform/transition styles that animate the row while sorting. */
  style: CSSProperties
  /** `true` while this row is being dragged. */
  isDragging: boolean
  /** `true` while another dragged row is over this one. */
  isOver: boolean
}
```

#### `SortableListProps`

Props for {@link SortableList}.

```typescript
interface SortableListProps<T extends { id: string }> {
  /** Ordered items to render. Each must have a stable string `id`. */
  items: T[]
  /**
   * Called with the full reordered array when a drag completes a move. This is
   * the core `SortableOptions['onReorder']` callback — persist the new order.
   *
   * @param items - The reordered items.
   */
  onReorder: (items: T[]) => void
  /** Sort axis. Selects the default sorting strategy. Defaults to `'vertical'`. */
  axis?: SortableAxis
  /** Explicit sorting strategy override. */
  strategy?: SortableStrategy
  /** Disable all drag interactions. Defaults to `false`. */
  disabled?: boolean
  /** Sensor activation thresholds (pointer delay / distance). */
  config?: DndKitConfig
  /** Optional passthrough: fired when a drag starts. */
  onDragStart?: (event: DragStartEvent) => void
  /** Optional passthrough: fired while dragging over a target. */
  onDragOver?: (event: DragOverEvent) => void
  /** Optional passthrough: fired when a drag ends (before/besides `onReorder`). */
  onDragEnd?: (event: DragEndEvent) => void
  /** The rendered list — items using {@link useSortableItem} for their rows. */
  children: ReactNode
}
```

#### `UseSortableItemOptions`

Options for {@link useSortableItem}.

```typescript
interface UseSortableItemOptions {
  /** The sortable item's id — must match the `id` of the corresponding item. */
  id: string
  /** Arbitrary data carried with the drag (surfaced on drag events). */
  data?: Record<string, unknown>
  /** Whether this specific item is undraggable. Defaults to `false`. */
  disabled?: boolean
}
```

### Functions

#### `createDndKitProvider(_config)`

Creates a dnd-kit-based drag-drop provider.

```typescript
function createDndKitProvider(_config?: DndKitConfig): DragDropProvider
```

- `_config` — Optional dnd-kit-specific configuration.

**Returns:** A `DragDropProvider` backed by dnd-kit state management.

#### `createSortableSensors(config)`

Builds the sensor descriptor list used by {@link SortableList}: a pointer
sensor (mouse/touch) and a keyboard sensor wired to
`sortableKeyboardCoordinates` so a sortable list is keyboard-accessible.
Exported so callers/tests can assert both sensors are present.

```typescript
function createSortableSensors(config?: DndKitConfig): (SensorDescriptor<PointerSensorOptions> | SensorDescriptor<KeyboardSensorOptions>)[]
```

- `config` — dnd-kit provider configuration (activation thresholds).

**Returns:** The pointer + keyboard sensor descriptors.

#### `handleSortableDragEnd(event, context)`

Bridges a

```typescript
function handleSortableDragEnd(event: DndKitDragEndEvent, context: SortableDragEndContext<T>): void
```

- `event` — The
- `context` — Items, callbacks, and disabled flag.

#### `resolveSortingStrategy(axis, strategy)`

Maps a molecule {@link SortableAxis}/{@link SortableStrategy} to a concrete

```typescript
function resolveSortingStrategy(axis?: SortableAxis, strategy?: SortableStrategy): SortingStrategy
```

- `axis` — The sort axis. Defaults to `'vertical'`.
- `strategy` — An explicit strategy override.

**Returns:** The

#### `SortableList(props)`

A real

```typescript
function SortableList(props: SortableListProps<T>): JSX.Element
```

- `props` — {@link SortableListProps}.

**Returns:** The drag-and-drop context wrapping the sortable list.

#### `useSortableItem(options)`

Wraps

```typescript
function useSortableItem(options: UseSortableItemOptions): SortableItemState
```

- `options` — {@link UseSortableItemOptions}.

**Returns:** The refs, attributes, listeners, and transform style for the row.

### Constants

#### `provider`

Default dnd-kit drag-drop provider instance.

```typescript
const provider: DragDropProvider
```

## Core Interface
Implements `@molecule/app-drag-drop` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-drag-drop'
import { provider } from '@molecule/app-drag-drop-dndkit'

export function setupDragDropDndkit(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-drag-drop` >=1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`
- `@molecule/app-drag-drop`
- `react`
- `react-dom`

The React binding requires `react` / `react-dom` (peer dependencies) since

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
