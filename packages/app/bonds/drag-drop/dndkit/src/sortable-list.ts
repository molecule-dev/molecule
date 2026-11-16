/**
 * What every framework's dnd-kit sortable list shares.
 *
 * `@molecule/app-drag-drop-dndkit-react`, `-vue`, `-solid`, `-svelte` and `-angular`
 * each render a sortable list on `@dnd-kit`'s DOM layer (`@dnd-kit/dom`). The
 * decisions that must not differ between them live here, once: which sensors
 * start a drag and with what thresholds, which axis a drag may move along, what
 * a screen reader hears (translated, naming items by their labels rather than
 * their ids), how a drop becomes the new order, and the core drag events each
 * list reports.
 *
 * @module
 */

import { RestrictToHorizontalAxis, RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers'
import type {
  DragDropManagerInput,
  DragEndEvent as DndKitDragEndEvent,
  Draggable,
  Droppable,
} from '@dnd-kit/dom'
import {
  Accessibility,
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
} from '@dnd-kit/dom'
import { isSortable } from '@dnd-kit/dom/sortable'
import { arrayMove } from '@dnd-kit/helpers'

import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  SortableAxis,
  SortableStrategy,
} from '@molecule/app-drag-drop'
import { t } from '@molecule/app-i18n'

import { sortableListInstructions, SortableListLocale } from './sortable-list-locale.js'
import type { DndKitConfig } from './types.js'

/** The options dnd-kit's accessibility plugin takes (dnd-kit does not export the type). */
type AccessibilityOptions = NonNullable<ConstructorParameters<typeof Accessibility>[1]>

/**
 * A dnd-kit sensor list: the list form of what a manager takes (it also takes
 * a function of its defaults, which a sortable list never passes).
 */
export type SortableListSensors = Exclude<
  NonNullable<DragDropManagerInput['sensors']>,
  (...args: never[]) => unknown
>
/** The plugins a dnd-kit manager takes: a list, or a function of dnd-kit's default list. */
export type SortableListPlugins = NonNullable<DragDropManagerInput['plugins']>
/** A dnd-kit modifier list: the list form of what a manager takes. */
export type SortableListModifiers = Exclude<
  NonNullable<DragDropManagerInput['modifiers']>,
  (...args: never[]) => unknown
>

/** A dnd-kit entity as the drag events carry it: its id and its data. */
interface DragEntity {
  /** The entity's id. */
  id: string | number
  /** The data it carries. */
  data?: unknown
}

/**
 * The pointer and keyboard sensors of a sortable list.
 *
 * The pointer (mouse, touch, pen) starts a drag after `activationDelay` ms when
 * one is set, letting a tap still be a click, else after `activationDistance`
 * px of movement, else at once. The keyboard picks an item up with Space or
 * Enter, moves it with the arrow keys and drops it with Space, Enter or Tab;
 * Escape cancels unless `cancelOnEscape` is `false`.
 *
 * @param config - Activation thresholds and the Escape behavior.
 * @returns The sensors for the list's manager.
 */
export function sortableListSensors(config: DndKitConfig = {}): SortableListSensors {
  const { activationDelay, activationDistance, cancelOnEscape = true } = config
  const constraints =
    typeof activationDelay === 'number' && activationDelay > 0
      ? [
          new PointerActivationConstraints.Delay({
            value: activationDelay,
            tolerance: activationDistance ?? 5,
          }),
        ]
      : typeof activationDistance === 'number' && activationDistance > 0
        ? [new PointerActivationConstraints.Distance({ value: activationDistance })]
        : undefined
  return [
    PointerSensor.configure({ activationConstraints: constraints }),
    KeyboardSensor.configure({
      keyboardCodes: {
        start: ['Space', 'Enter'],
        cancel: cancelOnEscape ? ['Escape'] : [],
        end: ['Space', 'Enter', 'Tab'],
        up: ['ArrowUp'],
        down: ['ArrowDown'],
        left: ['ArrowLeft'],
        right: ['ArrowRight'],
      },
    }),
  ]
}

/**
 * The axis a list's items move along: `axis` when given, else the axis of
 * `strategy` (`'grid'` is `'both'`), else `'vertical'`.
 *
 * @param axis - The list's `axis` option.
 * @param strategy - The list's `strategy` option.
 * @returns The axis.
 */
export function resolveSortableAxis(
  axis?: SortableAxis,
  strategy?: SortableStrategy,
): SortableAxis {
  if (axis) return axis
  if (strategy === 'grid') return 'both'
  return strategy ?? 'vertical'
}

/**
 * The modifiers that hold a drag to the list's axis: a vertical list moves
 * items up and down only, a horizontal one left and right only, and `'both'`
 * in any direction.
 *
 * @param axis - The resolved axis (see {@link resolveSortableAxis}).
 * @returns The modifiers for the list's manager.
 */
export function sortableListModifiers(axis: SortableAxis): SortableListModifiers {
  if (axis === 'vertical') return [RestrictToVerticalAxis]
  if (axis === 'horizontal') return [RestrictToHorizontalAxis]
  return []
}

/**
 * How a sortable list names its items and counts them for a screen reader.
 * Each framework passes functions that read its current `items`, so the
 * announcements follow the list as it changes.
 */
export interface SortableListAnnouncer {
  /**
   * The label a screen reader hears for an item.
   *
   * @param id - The item's id.
   * @returns Its label (the list's `getItemLabel`, else the id).
   */
  labelOf: (id: string) => string
  /**
   * How many items the list holds now.
   *
   * @returns The count.
   */
  count: () => number
}

/**
 * A dragged row's 1-based position, for an announcement.
 *
 * @param source - The dragged entity.
 * @param initial - Whether to read the position the drag started from.
 * @returns The position; `1` when the entity is not sortable.
 */
function sourcePosition(source: Draggable, initial: boolean): number {
  if (!isSortable(source)) return 1
  return (initial ? source.initialIndex : source.index) + 1
}

/**
 * The 1-based position of the row a dragged row is over, for an announcement.
 *
 * @param target - The entity under the dragged row.
 * @returns The position; `1` when the entity is not sortable.
 */
function targetPosition(target: Droppable): number {
  return isSortable(target) ? target.index + 1 : 1
}

/** Numbers each list's instructions element, so {@link SortableListLocale} can find it. */
let lists = 0

/**
 * The plugins of a sortable list: dnd-kit's defaults, with the accessibility
 * plugin's instructions and announcements translated through `t()` and naming
 * items by their labels and positions instead of their ids, plus
 * {@link SortableListLocale}, which gives each row its translated role
 * description and rewrites the instructions when the locale changes. Call it
 * once per list.
 *
 * @param announcer - How the list names and counts its items.
 * @returns The plugins for the list's manager.
 */
export function sortableListPlugins(announcer: SortableListAnnouncer): SortableListPlugins {
  const { labelOf, count } = announcer
  lists += 1
  const id = String(lists)
  const descriptionPrefix = 'mol-sortable-instructions'
  const options: AccessibilityOptions = {
    id,
    idPrefix: { description: descriptionPrefix, announcement: 'mol-sortable-announcement' },
    screenReaderInstructions: {
      // Read when the first row registers, so the text is in the locale of that moment.
      get draggable(): string {
        return sortableListInstructions()
      },
    },
    announcements: {
      dragstart({ operation: { source } }) {
        if (!source) return undefined
        return t(
          'dragDrop.sortable.pickedUp',
          {
            label: labelOf(String(source.id)),
            position: sourcePosition(source, true),
            total: count(),
          },
          { defaultValue: 'Picked up {{label}}, position {{position}} of {{total}}.' },
        )
      },
      dragover({ operation: { source, target } }) {
        if (!source || !target || source.id === target.id) return undefined
        return t(
          'dragDrop.sortable.movedOver',
          { label: labelOf(String(source.id)), position: targetPosition(target), total: count() },
          { defaultValue: '{{label}} is over position {{position}} of {{total}}.' },
        )
      },
      dragend({ operation: { source }, canceled }) {
        if (!source) return undefined
        const label = labelOf(String(source.id))
        if (canceled)
          return t(
            'dragDrop.sortable.cancelled',
            { label, position: sourcePosition(source, true), total: count() },
            {
              defaultValue:
                'Reordering cancelled. {{label}} is back at position {{position}} of {{total}}.',
            },
          )
        return t(
          'dragDrop.sortable.dropped',
          { label, position: sourcePosition(source, false), total: count() },
          { defaultValue: 'Dropped {{label}} at position {{position}} of {{total}}.' },
        )
      },
    },
  }
  const accessibility = Accessibility.configure(options)
  const locale = SortableListLocale.configure({ descriptionId: `${descriptionPrefix}-${id}` })
  return (defaults) => [
    ...defaults.map((plugin) => (plugin === Accessibility ? accessibility : plugin)),
    locale,
  ]
}

/**
 * The core drag-start event of a dnd-kit drag start.
 *
 * @param source - The dragged entity (`event.operation.source`).
 * @returns The core event, or `undefined` when nothing is dragged.
 */
export function coreDragStart(source: DragEntity | null): DragStartEvent | undefined {
  return source ? { id: String(source.id), data: source.data } : undefined
}

/**
 * The core drag-over event of a dnd-kit drag over: none while the item is over
 * nothing or over itself.
 *
 * @param source - The dragged entity.
 * @param target - The entity under it.
 * @returns The core event, or `undefined`.
 */
export function coreDragOver(
  source: DragEntity | null,
  target: DragEntity | null,
): DragOverEvent | undefined {
  if (!source || !target || source.id === target.id) return undefined
  return { id: String(source.id), overId: String(target.id), data: source.data }
}

/**
 * The outcome of a drop on a sortable list.
 *
 * @template T - The item type.
 */
export interface SortableListDrop<T> {
  /** The core drag-end event; `undefined` when nothing was dragged. */
  event: DragEndEvent | undefined
  /** The items in their new order, or `null` when the order did not change. */
  reordered: T[] | null
}

/**
 * What a drop does to a sortable list. The order changes unless the drag was
 * cancelled, the list is disabled, or the item was dropped where it started;
 * the core event's `overId` is the item whose place it took.
 *
 * @template T - The item type (must have a string `id`).
 * @param items - The list's items, in their order before the drag.
 * @param event - dnd-kit's drag-end event.
 * @param disabled - Whether the list is disabled. Defaults to `false`.
 * @returns The core event and the new order.
 */
export function sortableListDrop<T extends { id: string }>(
  items: readonly T[],
  event: DndKitDragEndEvent,
  disabled = false,
): SortableListDrop<T> {
  const { source, target } = event.operation
  if (!source) return { event: undefined, reordered: null }
  const id = String(source.id)
  // The dragged row's own index is where the drop leaves it, whether or not anything is under the
  // pointer at that moment (dnd-kit's sortable plugin moves it during the drag).
  if (!isSortable(source)) {
    const overId = target && !event.canceled ? String(target.id) : undefined
    return { event: { id, overId, data: source.data }, reordered: null }
  }
  const from = items.findIndex((item) => item.id === id)
  const to = source.index
  const moved =
    !disabled && !event.canceled && from !== -1 && to >= 0 && to < items.length && from !== to
  const overId = event.canceled ? undefined : (items[to]?.id ?? undefined)
  return {
    event: { id, overId, data: source.data },
    reordered: moved ? arrayMove([...items], from, to) : null,
  }
}
