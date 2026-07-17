/**
 * Real @dnd-kit React binding for the molecule drag-drop bond.
 *
 * This is the shipped framework binding that bridges DOM drag events to the
 * `@molecule/app-drag-drop` contract — the piece the headless order store on
 * its own cannot provide. `<SortableList>` wraps @dnd-kit's `DndContext` +
 * `SortableContext` with pointer **and** keyboard sensors; on drop it reorders
 * with @dnd-kit's `arrayMove` and invokes the core `onReorder` callback with
 * the new item order. `useSortableItem` wraps `useSortable` for rendering the
 * individual draggable rows (spread `listeners` on the row body for
 * whole-item dragging, or on a handle via `setActivatorNodeRef`).
 *
 * @example
 * ```tsx
 * import { SortableList, useSortableItem } from '@molecule/app-drag-drop-dndkit'
 *
 * function Row({ item }: { item: { id: string; label: string } }) {
 *   const { setNodeRef, attributes, listeners, style } = useSortableItem({ id: item.id })
 *   return (
 *     <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
 *       {item.label}
 *     </li>
 *   )
 * }
 *
 * function List({ items, setItems }: {
 *   items: { id: string; label: string }[]
 *   setItems: (next: { id: string; label: string }[]) => void
 * }) {
 *   return (
 *     <SortableList items={items} onReorder={setItems} axis="vertical">
 *       <ul>{items.map((item) => <Row key={item.id} item={item} />)}</ul>
 *     </SortableList>
 *   )
 * }
 * ```
 *
 * @remarks
 * - A pointer sensor and a keyboard sensor (`sortableKeyboardCoordinates`) are
 *   always wired, so reordering works with the mouse/touch AND the keyboard
 *   (grab with Space, move with the arrow keys, drop with Space).
 * - `DndKitConfig.activationDelay` / `activationDistance` are honored here via
 *   the pointer sensor's activation constraint (delay wins if both are set).
 * - Persist the new order from `onReorder`; on failure restore the previous
 *   order in your own state so the UI never lies about saved state.
 *
 * @module
 */

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensors } from '@dnd-kit/core'
import type {
  DragEndEvent as DndKitDragEndEvent,
  DragOverEvent as DndKitDragOverEvent,
  DragStartEvent as DndKitDragStartEvent,
  DraggableAttributes,
  DraggableSyntheticListeners,
  KeyboardSensorOptions,
  PointerActivationConstraint,
  PointerSensorOptions,
  SensorDescriptor,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { SortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, JSX, ReactNode } from 'react'
import { useMemo } from 'react'

import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  SortableAxis,
  SortableStrategy,
} from '@molecule/app-drag-drop'

import type { DndKitConfig } from './types.js'

// ---------------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------------

/**
 * Builds a @dnd-kit pointer activation constraint from the provider config.
 * A positive `activationDelay` produces a delay+tolerance constraint (useful
 * for touch, so a tap still registers as a click); otherwise a positive
 * `activationDistance` produces a distance constraint. `undefined` means the
 * pointer activates immediately.
 *
 * @param config - dnd-kit provider configuration.
 * @returns The pointer activation constraint, or `undefined` for immediate activation.
 */
function pointerActivationConstraint(
  config: DndKitConfig,
): PointerActivationConstraint | undefined {
  if (typeof config.activationDelay === 'number' && config.activationDelay > 0) {
    return { delay: config.activationDelay, tolerance: config.activationDistance ?? 5 }
  }
  if (typeof config.activationDistance === 'number' && config.activationDistance > 0) {
    return { distance: config.activationDistance }
  }
  return undefined
}

/**
 * Builds the sensor descriptor list used by {@link SortableList}: a pointer
 * sensor (mouse/touch) and a keyboard sensor wired to
 * `sortableKeyboardCoordinates` so a sortable list is keyboard-accessible.
 * Exported so callers/tests can assert both sensors are present.
 *
 * @param config - dnd-kit provider configuration (activation thresholds).
 * @returns The pointer + keyboard sensor descriptors.
 */
export function createSortableSensors(
  config: DndKitConfig = {},
): (SensorDescriptor<PointerSensorOptions> | SensorDescriptor<KeyboardSensorOptions>)[] {
  const pointer: SensorDescriptor<PointerSensorOptions> = {
    sensor: PointerSensor,
    options: { activationConstraint: pointerActivationConstraint(config) },
  }
  const keyboard: SensorDescriptor<KeyboardSensorOptions> = {
    sensor: KeyboardSensor,
    options: { coordinateGetter: sortableKeyboardCoordinates },
  }
  return [pointer, keyboard]
}

// ---------------------------------------------------------------------------
// Strategy
// ---------------------------------------------------------------------------

/**
 * Maps a molecule {@link SortableAxis}/{@link SortableStrategy} to a concrete
 * @dnd-kit sorting strategy. An explicit `strategy` wins; otherwise the axis
 * selects it (`horizontal` → horizontal list, `both` → grid, else vertical).
 *
 * @param axis - The sort axis. Defaults to `'vertical'`.
 * @param strategy - An explicit strategy override.
 * @returns The @dnd-kit sorting strategy to pass to `SortableContext`.
 */
export function resolveSortingStrategy(
  axis: SortableAxis = 'vertical',
  strategy?: SortableStrategy,
): SortingStrategy {
  const resolved: SortableStrategy =
    strategy ?? (axis === 'horizontal' ? 'horizontal' : axis === 'both' ? 'grid' : 'vertical')
  switch (resolved) {
    case 'horizontal':
      return horizontalListSortingStrategy
    case 'grid':
      return rectSortingStrategy
    case 'vertical':
    default:
      return verticalListSortingStrategy
  }
}

// ---------------------------------------------------------------------------
// Drag-end bridge
// ---------------------------------------------------------------------------

/**
 * Inputs for {@link handleSortableDragEnd}.
 *
 * @template T - The item type (must have a string `id`).
 */
export interface SortableDragEndContext<T extends { id: string }> {
  /** The current ordered items. */
  items: T[]
  /** Core reorder callback, invoked with the new order after a real move. */
  onReorder: (items: T[]) => void
  /** Whether sorting is disabled — suppresses the reorder. Defaults to `false`. */
  disabled?: boolean
  /** Optional passthrough of the core drag-end event. */
  onDragEnd?: (event: DragEndEvent) => void
}

/**
 * Bridges a @dnd-kit drag-end to the core drag-drop contract. Emits the core
 * `onDragEnd` event, then — unless sorting is disabled, the drop landed nowhere,
 * or the item was dropped in place — reorders `items` with @dnd-kit's
 * `arrayMove` and invokes `onReorder` with the new order. This is the exact
 * handler {@link SortableList} passes to `DndContext.onDragEnd`, so a real drop
 * runs this code and `onReorder` fires with the reordered array.
 *
 * @template T - The item type.
 * @param event - The @dnd-kit drag-end event (`active` / `over`).
 * @param context - Items, callbacks, and disabled flag.
 */
export function handleSortableDragEnd<T extends { id: string }>(
  event: DndKitDragEndEvent,
  context: SortableDragEndContext<T>,
): void {
  const { active, over } = event
  const { items, onReorder, disabled = false, onDragEnd } = context

  onDragEnd?.({
    id: String(active.id),
    overId: over ? String(over.id) : undefined,
    data: active.data.current,
  })

  if (disabled || !over || active.id === over.id) {
    return
  }

  const oldIndex = items.findIndex((item) => item.id === String(active.id))
  const newIndex = items.findIndex((item) => item.id === String(over.id))
  if (oldIndex === -1 || newIndex === -1) {
    return
  }

  onReorder(arrayMove(items, oldIndex, newIndex))
}

// ---------------------------------------------------------------------------
// SortableList
// ---------------------------------------------------------------------------

/**
 * Props for {@link SortableList}.
 *
 * @template T - The item type. Items must have a string `id`.
 */
export interface SortableListProps<T extends { id: string }> {
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

/**
 * A real @dnd-kit sortable list. Wraps `DndContext` + `SortableContext` with a
 * pointer and a keyboard sensor and, on drop, reorders `items` and calls
 * `onReorder` with the new order (via {@link handleSortableDragEnd}). Render
 * the list itself as `children`, using {@link useSortableItem} for each row.
 *
 * @template T - The item type.
 * @param props - {@link SortableListProps}.
 * @returns The drag-and-drop context wrapping the sortable list.
 */
export function SortableList<T extends { id: string }>(props: SortableListProps<T>): JSX.Element {
  const {
    items,
    onReorder,
    axis,
    strategy,
    disabled = false,
    config,
    onDragStart,
    onDragOver,
    onDragEnd,
    children,
  } = props

  const sensorDescriptors = useMemo(() => createSortableSensors(config ?? {}), [config])
  const sensors = useSensors(...sensorDescriptors)
  const sortingStrategy = useMemo(() => resolveSortingStrategy(axis, strategy), [axis, strategy])
  const itemIds = useMemo(() => items.map((item) => item.id), [items])

  function handleDragStart(event: DndKitDragStartEvent): void {
    onDragStart?.({ id: String(event.active.id), data: event.active.data.current })
  }

  function handleDragOver(event: DndKitDragOverEvent): void {
    const { active, over } = event
    if (!over) {
      return
    }
    onDragOver?.({ id: String(active.id), overId: String(over.id), data: active.data.current })
  }

  function handleDragEnd(event: DndKitDragEndEvent): void {
    handleSortableDragEnd(event, { items, onReorder, disabled, onDragEnd })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={sortingStrategy} disabled={disabled}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// useSortableItem
// ---------------------------------------------------------------------------

/**
 * Options for {@link useSortableItem}.
 */
export interface UseSortableItemOptions {
  /** The sortable item's id — must match the `id` of the corresponding item. */
  id: string
  /** Arbitrary data carried with the drag (surfaced on drag events). */
  data?: Record<string, unknown>
  /** Whether this specific item is undraggable. Defaults to `false`. */
  disabled?: boolean
}

/**
 * The wiring returned by {@link useSortableItem} for a single sortable row.
 */
export interface SortableItemState {
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

/**
 * Wraps @dnd-kit's `useSortable` for a single row inside a {@link SortableList}.
 * Spread `attributes` + `listeners` onto the row (or `listeners` onto a handle
 * bound with `setActivatorNodeRef`), attach `setNodeRef`, and apply `style`.
 *
 * @param options - {@link UseSortableItemOptions}.
 * @returns The refs, attributes, listeners, and transform style for the row.
 */
export function useSortableItem(options: UseSortableItemOptions): SortableItemState {
  const { id, data, disabled } = options
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id, data, disabled })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return { setNodeRef, setActivatorNodeRef, attributes, listeners, style, isDragging, isOver }
}
