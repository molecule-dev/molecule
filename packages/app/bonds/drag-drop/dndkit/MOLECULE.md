# @molecule/app-drag-drop-dndkit

dnd-kit drag-drop provider for molecule.dev.

Implements `DragDropProvider` from `@molecule/app-drag-drop` using a
dnd-kit-compatible state management layer. Framework bindings wire these
instances to `@dnd-kit/core` (React), `@dnd-kit/vue`, or equivalent
libraries for actual DOM interactions.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-drag-drop-dndkit
```

## Usage

```typescript
import { provider } from '@molecule/app-drag-drop-dndkit'
import { setProvider } from '@molecule/app-drag-drop'

setProvider(provider)
```

## API

### Interfaces

#### `DndKitConfig`

Configuration options for the dnd-kit drag-drop provider.

```typescript
interface DndKitConfig {
  /**
   * Activation delay in milliseconds before a drag starts.
   * Useful for distinguishing between click and drag on touch devices.
   * Defaults to `0`.
   */
  activationDelay?: number

  /**
   * Distance in pixels a pointer must travel before a drag starts.
   * Defaults to `0`.
   */
  activationDistance?: number

  /**
   * Whether to cancel a drag when the Escape key is pressed.
   * Defaults to `true`.
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

### Functions

#### `createDndKitProvider(_config)`

Creates a dnd-kit-based drag-drop provider.

```typescript
function createDndKitProvider(_config?: DndKitConfig): DragDropProvider
```

- `_config` — Optional dnd-kit-specific configuration.

**Returns:** A `DragDropProvider` backed by dnd-kit state management.

### Constants

#### `provider`

Default dnd-kit drag-drop provider instance.

```typescript
const provider: DragDropProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-drag-drop` >=1.0.0
