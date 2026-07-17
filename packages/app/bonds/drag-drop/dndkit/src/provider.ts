/**
 * dnd-kit implementation of the molecule DragDropProvider.
 *
 * Provides the imperative order-store layer for drag-and-drop. Reorders are
 * computed with @dnd-kit's own `arrayMove`, so the imperative store and the
 * React binding (see `./react.tsx`) agree on move semantics. The React binding
 * (`SortableList` + `useSortableItem`) is the shipped DOM-event bridge that
 * drives a real drag → `onReorder`; framework bindings may also drive the
 * extended instance types ({@link DndKitSortableInstance},
 * {@link DndKitDraggableInstance}, {@link DndKitDroppableInstance}) directly.
 *
 * @module
 */

import { arrayMove } from '@dnd-kit/sortable'

import type {
  DragDropProvider,
  DraggableOptions,
  DroppableOptions,
  SortableInstance,
  SortableOptions,
} from '@molecule/app-drag-drop'

import type {
  DndKitConfig,
  DndKitDraggableInstance,
  DndKitDroppableInstance,
  DndKitSortableInstance,
} from './types.js'

// ---------------------------------------------------------------------------
// Sortable
// ---------------------------------------------------------------------------

/**
 * Creates a sortable instance that manages item ordering and active drag state.
 *
 * @template T - The item type (must have a string `id` property).
 * @param options - Sortable configuration from the core interface.
 * @returns A DndKitSortableInstance backed by in-memory state.
 */
function createSortableInstance<T extends { id: string }>(
  options: SortableOptions<T>,
): DndKitSortableInstance<T> {
  let items = [...options.items]
  let activeId: string | null = null
  let disabled = options.disabled ?? false

  return {
    getItems(): T[] {
      return [...items]
    },

    setItems(newItems: T[]): void {
      items = [...newItems]
    },

    getActiveId(): string | null {
      return activeId
    },

    setDisabled(value: boolean): void {
      disabled = value
    },

    destroy(): void {
      items = []
      activeId = null
    },

    _setActiveId(id: string | null): void {
      activeId = id
    },

    _reorder(fromIndex: number, toIndex: number): void {
      if (disabled) return
      if (fromIndex < 0 || fromIndex >= items.length) return
      if (toIndex < 0 || toIndex >= items.length) return
      items = arrayMove(items, fromIndex, toIndex)
      options.onReorder(items)
    },

    _isDisabled(): boolean {
      return disabled
    },
  }
}

// ---------------------------------------------------------------------------
// Draggable
// ---------------------------------------------------------------------------

/**
 * Creates a draggable instance that tracks drag state for a single item.
 *
 * @param options - Draggable configuration from the core interface.
 * @returns A DndKitDraggableInstance backed by in-memory state.
 */
function createDraggableInstance(options: DraggableOptions): DndKitDraggableInstance {
  let data = options.data
  let disabled = options.disabled ?? false
  let dragging = false

  return {
    getId(): string {
      return options.id
    },

    isDragging(): boolean {
      return dragging
    },

    setDisabled(value: boolean): void {
      disabled = value
    },

    setData(newData: unknown): void {
      data = newData
    },

    destroy(): void {
      dragging = false
    },

    _setDragging(value: boolean): void {
      dragging = value
    },

    _getData(): unknown {
      return data
    },

    _isDisabled(): boolean {
      return disabled
    },
  }
}

// ---------------------------------------------------------------------------
// Droppable
// ---------------------------------------------------------------------------

/**
 * Creates a droppable instance that tracks hover state for a drop zone.
 *
 * @param options - Droppable configuration from the core interface.
 * @returns A DndKitDroppableInstance backed by in-memory state.
 */
function createDroppableInstance(options: DroppableOptions): DndKitDroppableInstance {
  let disabled = options.disabled ?? false
  let over = false

  return {
    getId(): string {
      return options.id
    },

    isOver(): boolean {
      return over
    },

    setDisabled(value: boolean): void {
      disabled = value
    },

    destroy(): void {
      over = false
    },

    _setOver(value: boolean): void {
      over = value
    },

    _accepts(type?: string): boolean {
      if (disabled) return false
      if (!options.accept || options.accept.length === 0) return true
      return type !== undefined && options.accept.includes(type)
    },

    _handleDrop(data: unknown, draggableId: string): void {
      if (disabled) return
      options.onDrop(data, draggableId)
    },

    _isDisabled(): boolean {
      return disabled
    },
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a dnd-kit-based drag-drop provider.
 *
 * @param _config - Optional dnd-kit-specific configuration.
 * @returns A `DragDropProvider` backed by dnd-kit state management.
 *
 * @example
 * ```typescript
 * import { createDndKitProvider } from '@molecule/app-drag-drop-dndkit'
 * import { setProvider } from '@molecule/app-drag-drop'
 *
 * setProvider(createDndKitProvider())
 * ```
 */
export function createDndKitProvider(_config: DndKitConfig = {}): DragDropProvider {
  return {
    createSortable<T extends { id: string }>(options: SortableOptions<T>): SortableInstance<T> {
      return createSortableInstance(options)
    },

    createDraggable(options: DraggableOptions): DndKitDraggableInstance {
      return createDraggableInstance(options)
    },

    createDroppable(options: DroppableOptions): DndKitDroppableInstance {
      return createDroppableInstance(options)
    },
  }
}

/** Default dnd-kit drag-drop provider instance. */
export const provider: DragDropProvider = createDndKitProvider()
