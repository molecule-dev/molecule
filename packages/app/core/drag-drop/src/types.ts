/**
 * Drag-and-drop provider interface and related types.
 *
 * Defines framework-agnostic contracts for sortable lists, draggable items,
 * and droppable zones with support for vertical, horizontal, and grid layouts.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Axis & direction
// ---------------------------------------------------------------------------

/** Allowed sort axes for sortable containers. */
export type SortableAxis = 'vertical' | 'horizontal' | 'both'

/** Strategy used to detect drop position within a sortable container. */
export type SortableStrategy = 'vertical' | 'horizontal' | 'grid'

// ---------------------------------------------------------------------------
// Drag events
// ---------------------------------------------------------------------------

/**
 * Payload emitted when a drag operation starts.
 */
export interface DragStartEvent {
  /** Identifier of the dragged item. */
  id: string
  /** Arbitrary data attached to the dragged item. */
  data?: unknown
}

/**
 * Payload emitted while the user is dragging (move / over events).
 */
export interface DragMoveEvent {
  /** Identifier of the dragged item. */
  id: string
  /** Identifier of the item or zone currently hovered over, if any. */
  overId?: string
  /** Arbitrary data attached to the dragged item. */
  data?: unknown
}

/**
 * Payload emitted when a drag operation ends (drop or cancel).
 */
export interface DragEndEvent {
  /** Identifier of the dragged item. */
  id: string
  /** Identifier of the item or zone the item was dropped onto, if any. */
  overId?: string
  /** Arbitrary data attached to the dragged item. */
  data?: unknown
}

/**
 * Payload emitted when a draggable enters a droppable zone.
 */
export interface DragOverEvent {
  /** Identifier of the dragged item. */
  id: string
  /** Identifier of the droppable zone being hovered. */
  overId: string
  /** Arbitrary data attached to the dragged item. */
  data?: unknown
}

// ---------------------------------------------------------------------------
// Sortable
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a sortable container.
 *
 * @template T - The item type. Items must have a string `id` property.
 */
export interface SortableOptions<T extends { id: string }> {
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

/**
 * A live sortable container instance.
 *
 * @template T - The item type.
 */
export interface SortableInstance<T extends { id: string }> {
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

// ---------------------------------------------------------------------------
// Draggable
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a draggable item.
 */
export interface DraggableOptions {
  /** Unique identifier for the draggable item. */
  id: string
  /** Arbitrary data payload carried with the drag. */
  data?: unknown
  /** Whether dragging is disabled for this item. Defaults to `false`. */
  disabled?: boolean
}

/**
 * A live draggable instance bound to a single element.
 */
export interface DraggableInstance {
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

// ---------------------------------------------------------------------------
// Droppable
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a droppable zone.
 */
export interface DroppableOptions {
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

/**
 * A live droppable zone instance.
 */
export interface DroppableInstance {
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

// ---------------------------------------------------------------------------
// Context options (top-level DnD context)
// ---------------------------------------------------------------------------

/**
 * Configuration for the top-level drag-and-drop context.
 */
export interface DragDropContextOptions {
  /** Called when a drag operation starts. */
  onDragStart?: (event: DragStartEvent) => void
  /** Called while dragging — when the item moves over a new target. */
  onDragOver?: (event: DragOverEvent) => void
  /** Called when the drag operation ends (drop or cancel). */
  onDragEnd?: (event: DragEndEvent) => void
  /** Called on every move tick during a drag (optional, high-frequency). */
  onDragMove?: (event: DragMoveEvent) => void
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Contract that bond packages must implement to provide drag-and-drop
 * functionality.
 */
export interface DragDropProvider {
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
