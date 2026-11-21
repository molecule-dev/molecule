/**
 * Solid drag-handle reorderable list with HTML5 DnD AND keyboard reordering.
 *
 * Solid counterpart of `@molecule/app-reorderable-list-react`'s
 * `ReorderableList` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input. Apps own the data; this component only
 * renders rows and emits the new order on `onReorder`.
 *
 * @module
 */

import { createEffect, createSignal, createUniqueId, For, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ReorderableItem, ReorderableListProps } from './types.js'

/**
 * Drag-handle reorderable list with HTML5 DnD AND keyboard reordering. Apps own
 * the data; this component only renders + emits new order on `onReorder`.
 *
 * Use the optional `renderHandle` slot to limit drag to a specific element
 * (e.g. a "≡" handle on the left). Every row also ships explicit
 * move-up/move-down buttons; Alt+ArrowUp / Alt+ArrowDown on a focused move
 * button reorders too, and focus follows the item: when a move disables the
 * button that was used (the item reached the top or the bottom), focus moves
 * to the same row's other button. The list is fully reorderable without a
 * mouse.
 *
 * Each row renders its position ("Item 2 of 3") in a screen-reader-only span
 * that both of its move buttons reference through `aria-describedby`, so the
 * buttons announce where the item sits.
 *
 * React keys each row by the item's `id` value, so a re-passed or re-ordered
 * array keeps the rendered rows per id. Solid's `For` keys by reference, so the
 * rows are keyed through stable per-id records: the record for an id is created
 * once and reused, while the row's content reads the CURRENT item for that id
 * reactively.
 *
 * @param props - Component props (see {@link ReorderableListProps}).
 * @returns The rendered reorderable list.
 */
export function ReorderableList<T>(props: ReorderableListProps<T>): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [draggingId, setDraggingId] = createSignal<string | null>(null)
  const [overId, setOverId] = createSignal<string | null>(null)
  /** The list's id prefix; each row's position span is `${baseId}-position-${index}`. */
  const baseId = createUniqueId()
  /** The rows' move buttons, keyed by item id — the focus effect's targets. */
  const moveButtons = new Map<
    string,
    { up: HTMLButtonElement | null; down: HTMLButtonElement | null }
  >()
  /** The move whose focus settles once `items` changes: the item id and the button used. */
  let focusRequest: { id: string; button: 'up' | 'down' } | null = null

  /**
   * Moves the item at `index` by `delta` positions and emits the new order.
   * No-ops at the list boundaries. Shared by the move buttons and the
   * keyboard (Alt+Arrow) path so mouse and keyboard reordering stay identical.
   *
   * @param index - Current position of the item to move.
   * @param delta - -1 to move up, 1 to move down.
   */
  function moveItem(index: number, delta: -1 | 1): void {
    const to = index + delta
    if (to < 0 || to >= props.items.length) return
    const next = [...props.items]
    const [moved] = next.splice(index, 1)
    next.splice(to, 0, moved!)
    props.onReorder(next)
  }

  /**
   * Keyboard reordering for a focused row: Alt+ArrowUp / Alt+ArrowDown move it.
   * Alt is required so plain arrows still scroll/move the caret and browser
   * history navigation is left untouched.
   *
   * @param index - Position of the focused row.
   * @param e - The keyboard event.
   */
  function onItemKeyDown(index: number, e: KeyboardEvent): void {
    if (!e.altKey) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveItem(index, -1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveItem(index, 1)
    }
  }

  /**
   * Registers one move button under its item id (a `ref` callback), so the
   * focus effect can reach either button of that row.
   *
   * @param id - The row's item id.
   * @param button - Which button of the row this is.
   * @returns The `ref` callback for the button.
   */
  function registerMoveButton(id: string, button: 'up' | 'down'): (el: HTMLButtonElement) => void {
    return (el) => {
      const row = moveButtons.get(id) ?? { up: null, down: null }
      row[button] = el
      moveButtons.set(id, row)
    }
  }

  /**
   * Moves the item with a move button, recording which button was used so the
   * focus effect can settle focus after the new order lands.
   *
   * @param id - The moved item's id.
   * @param index - Current position of the item to move.
   * @param delta - -1 to move up, 1 to move down.
   * @param button - The button the move came from.
   */
  function moveFromButton(id: string, index: number, delta: -1 | 1, button: 'up' | 'down'): void {
    focusRequest = { id, button }
    moveItem(index, delta)
  }

  /**
   * Keyboard reordering for a focused move button: Alt+ArrowUp / Alt+ArrowDown
   * move its item. A key that moves also records the button used, for the same
   * focus settling a click gets.
   *
   * @param id - The row's item id.
   * @param index - Current position of the row's item.
   * @param button - Which button of the row this is.
   * @param e - The keyboard event.
   */
  function onButtonKeyDown(
    id: string,
    index: number,
    button: 'up' | 'down',
    e: KeyboardEvent,
  ): void {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      focusRequest = { id, button }
    }
    onItemKeyDown(index, e)
  }

  // Focus settles after a move: when the button that was used is disabled by
  // the new order (the item reached the top or the bottom), focus moves to
  // the same row's other move button; otherwise it stays on the used button.
  // Runs after `items` changes and consumes the request the move recorded.
  // `createEffect` runs after the DOM has caught up, so the buttons are in
  // their new places.
  createEffect(() => {
    void props.items
    const request = focusRequest
    focusRequest = null
    if (!request) return
    const index = indexFor(request.id)
    if (index < 0) return
    const row = moveButtons.get(request.id)
    if (!row) return
    const usedDisabled = request.button === 'up' ? index === 0 : index === props.items.length - 1
    // React's and Vue's keyed reorders move rows with a single insertBefore,
    // which keeps the focused button focused; Solid's `For` detaches and
    // re-inserts the row, which blurs it — so the used button is re-focused
    // explicitly (a no-op when it never lost focus).
    const target = usedDisabled
      ? request.button === 'up'
        ? row.down
        : row.up
      : row[request.button]
    target?.focus()
  })

  /**
   * Initiates a drag operation, storing the dragged item id in the transfer payload.
   *
   * @param id - The dragged item's id.
   * @param e - The drag start event.
   */
  function onDragStart(id: string, e: DragEvent): void {
    e.dataTransfer?.setData('text/plain', id)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
    setDraggingId(id)
  }

  /**
   * Marks the hovered item as the current drop target and allows the drop.
   *
   * @param id - The hovered item's id.
   * @param e - The drag over event.
   */
  function onDragOver(id: string, e: DragEvent): void {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    setOverId(id)
  }

  /**
   * Handles a drop event by computing the new item order and calling `onReorder`.
   *
   * @param targetId - The id of the row dropped onto.
   * @param e - The drop event.
   */
  function onDrop(targetId: string, e: DragEvent): void {
    e.preventDefault()
    const sourceId = e.dataTransfer?.getData('text/plain')
    if (!sourceId || sourceId === targetId) {
      reset()
      return
    }
    const from = props.items.findIndex((i) => i.id === sourceId)
    const to = props.items.findIndex((i) => i.id === targetId)
    if (from < 0 || to < 0) {
      reset()
      return
    }
    const next = [...props.items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    props.onReorder(next)
    reset()
  }

  /** Clears dragging and over-target state after a drop or drag-end event. */
  function reset(): void {
    setDraggingId(null)
    setOverId(null)
  }

  /** One stable record per item id, created on first sight. */
  interface Row {
    id: string
  }
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.items.map((item) => {
      seen.add(item.id)
      let row = records.get(item.id)
      if (!row) {
        row = { id: item.id }
        records.set(item.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) {
      if (!seen.has(id)) {
        records.delete(id)
        moveButtons.delete(id)
      }
    }
    return rows
  }

  /**
   * The current item with this id.
   *
   * @param id - The row's item id.
   * @returns The item, read from the current `items`.
   */
  const itemFor = (id: string): ReorderableItem<T> =>
    props.items.find((i) => i.id === id) as ReorderableItem<T>

  /**
   * The current position of the item with this id.
   *
   * @param id - The row's item id.
   * @returns Its index in the current `items`.
   */
  const indexFor = (id: string): number => props.items.findIndex((i) => i.id === id)

  /**
   * The translated row position label, rendered in the row's
   * screen-reader-only span.
   *
   * @param index - The row's index.
   * @returns The label.
   */
  const positionLabel = (index: number): string =>
    t(
      'reorderableList.position',
      { index: index + 1, total: props.items.length },
      { defaultValue: 'Item {{index}} of {{total}}' },
    )

  /**
   * The row's inline style — React's drag opacity and drop-target border.
   *
   * @param isDragging - Whether the row is being dragged.
   * @param isOver - Whether the row is the current non-dragged drop target.
   * @returns The style object (Solid writes kebab-case keys).
   */
  const rowStyle = (isDragging: boolean, isOver: boolean): JSX.CSSProperties => ({
    opacity: isDragging ? 0.4 : 1,
    // An empty value clears the declaration (Solid writes each entry with
    // `style.setProperty`; removing the shorthand through `removeProperty`
    // leaves jsdom's expanded longhands behind).
    'border-top': isOver ? '2px solid currentColor' : '',
  })

  return (
    <ul class={cm.cn(cm.stack(1), props.className)}>
      <For each={keyedRows()}>
        {(row) => {
          const isDragging = (): boolean => draggingId() === row.id
          const isOver = (): boolean => overId() === row.id && draggingId() !== row.id
          return (
            <li
              draggable={!props.renderHandle}
              onDragStart={
                props.renderHandle ? undefined : (event: DragEvent) => onDragStart(row.id, event)
              }
              onDragEnd={reset}
              onDragOver={(event: DragEvent) => onDragOver(row.id, event)}
              onDrop={(event: DragEvent) => onDrop(row.id, event)}
              class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
              style={rowStyle(isDragging(), isOver())}
            >
              {props.renderHandle ? (
                <span
                  draggable="true"
                  onDragStart={(event: DragEvent) => onDragStart(row.id, event)}
                  onDragEnd={reset}
                  class={cm.cursorPointer}
                  aria-label={t(
                    'reorderableList.dragHandle',
                    {},
                    { defaultValue: 'Drag to reorder' },
                  )}
                >
                  {props.renderHandle()}
                </span>
              ) : null}
              <div class={cm.flex1}>{props.renderItem(itemFor(row.id), isDragging())}</div>
              <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <button
                  type="button"
                  data-mol-id={`reorderable-move-up-${row.id}`}
                  ref={registerMoveButton(row.id, 'up')}
                  onClick={() => moveFromButton(row.id, indexFor(row.id), -1, 'up')}
                  onKeyDown={(event: KeyboardEvent) =>
                    onButtonKeyDown(row.id, indexFor(row.id), 'up', event)
                  }
                  disabled={indexFor(row.id) === 0}
                  aria-label={t('reorderableList.moveUp', {}, { defaultValue: 'Move up' })}
                  aria-describedby={`${baseId}-position-${indexFor(row.id)}`}
                  class={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
                >
                  <span aria-hidden="true">↑</span>
                </button>
                <button
                  type="button"
                  data-mol-id={`reorderable-move-down-${row.id}`}
                  ref={registerMoveButton(row.id, 'down')}
                  onClick={() => moveFromButton(row.id, indexFor(row.id), 1, 'down')}
                  onKeyDown={(event: KeyboardEvent) =>
                    onButtonKeyDown(row.id, indexFor(row.id), 'down', event)
                  }
                  disabled={indexFor(row.id) === props.items.length - 1}
                  aria-label={t('reorderableList.moveDown', {}, { defaultValue: 'Move down' })}
                  aria-describedby={`${baseId}-position-${indexFor(row.id)}`}
                  class={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
                >
                  <span aria-hidden="true">↓</span>
                </button>
              </div>
              <span id={`${baseId}-position-${indexFor(row.id)}`} class={cm.srOnly}>
                {positionLabel(indexFor(row.id))}
              </span>
            </li>
          )
        }}
      </For>
    </ul>
  )
}
