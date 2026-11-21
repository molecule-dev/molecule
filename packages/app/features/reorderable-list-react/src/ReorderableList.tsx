import type { DragEvent, KeyboardEvent, ReactElement, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * A single item in a ReorderableList, pairing a stable string id with arbitrary data.
 */
export interface ReorderableItem<T> {
  id: string
  data: T
}

/** Props accepted by the {@link ReorderableList} component. */
export interface ReorderableListProps<T> {
  items: ReorderableItem<T>[]
  /** Called with the new order (full list). */
  onReorder: (next: ReorderableItem<T>[]) => void
  /** Per-item renderer. Receives item + isDragging flag. */
  renderItem: (item: ReorderableItem<T>, isDragging: boolean) => ReactNode
  /** Optional drag-handle slot — when omitted, the entire row is the drag target. */
  renderHandle?: () => ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Drag-handle reorderable list with HTML5 DnD AND keyboard reordering. Apps own
 * the data; this component only renders + emits new order on `onReorder`.
 *
 * Use the optional `renderHandle` slot to limit drag to a specific
 * element (e.g. a "≡" handle on the left). Every row also ships explicit
 * move-up/move-down buttons; Alt+ArrowUp / Alt+ArrowDown on a focused move
 * button reorders too, and focus follows the item: when a move disables the
 * button that was used (the item reached the top or the bottom), focus moves
 * to the same row's other button. The list is fully reorderable without a
 * mouse.
 *
 * Each row renders its position ("Item 2 of 3") in a screen-reader-only span
 * that both of its move buttons reference through `aria-describedby`, so the
 * buttons announce where the item sits.
 * @param props - Component props (see {@link ReorderableListProps}).
 */
export function ReorderableList<T>({
  items,
  onReorder,
  renderItem,
  renderHandle,
  className,
}: ReorderableListProps<T>): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  /** The list's id prefix; each row's position span is `${baseId}-position-${index}`. */
  const baseId = useId()
  /** The rows' move buttons, keyed by item id — the focus effect's targets. */
  const moveButtons = useRef(
    new Map<string, { up: HTMLButtonElement | null; down: HTMLButtonElement | null }>(),
  )
  /** The move whose focus settles once `items` changes: the item id and the button used. */
  const focusRequest = useRef<{ id: string; button: 'up' | 'down' } | null>(null)

  /**
   * Moves the item at `index` by `delta` positions and emits the new order.
   * No-ops at the list boundaries. Shared by the move buttons and the
   * keyboard (Alt+Arrow) path so mouse and keyboard reordering stay identical.
   * @param index - Current position of the item to move.
   * @param delta - -1 to move up, 1 to move down.
   */
  function moveItem(index: number, delta: -1 | 1): void {
    const to = index + delta
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [moved] = next.splice(index, 1)
    next.splice(to, 0, moved)
    onReorder(next)
  }
  /**
   * Keyboard reordering for a focused row: Alt+ArrowUp / Alt+ArrowDown move it.
   * Alt is required so plain arrows still scroll/move the caret and browser
   * history navigation is left untouched.
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
   * @param id - The row's item id.
   * @param button - Which button of the row this is.
   * @returns The `ref` callback for the button.
   */
  function registerMoveButton(
    id: string,
    button: 'up' | 'down',
  ): (el: HTMLButtonElement | null) => void {
    return (el) => {
      const row = moveButtons.current.get(id) ?? { up: null, down: null }
      row[button] = el
      moveButtons.current.set(id, row)
    }
  }

  /**
   * Moves the item with a move button, recording which button was used so the
   * focus effect can settle focus after the new order lands.
   * @param id - The moved item's id.
   * @param index - Current position of the item to move.
   * @param delta - -1 to move up, 1 to move down.
   * @param button - The button the move came from.
   */
  function moveFromButton(id: string, index: number, delta: -1 | 1, button: 'up' | 'down'): void {
    focusRequest.current = { id, button }
    moveItem(index, delta)
  }

  /**
   * Keyboard reordering for a focused move button: Alt+ArrowUp / Alt+ArrowDown
   * move its item. A key that moves also records the button used, for the same
   * focus settling a click gets.
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
      focusRequest.current = { id, button }
    }
    onItemKeyDown(index, e)
  }

  /**
   * Focus settles after a move: when the button that was used is disabled by
   * the new order (the item reached the top or the bottom), focus moves to the
   * same row's other move button; otherwise it stays (the row is keyed by item
   * id, so the focused button moves with its row). Runs after `items` changes
   * and consumes the request the move recorded.
   */
  useEffect(() => {
    const request = focusRequest.current
    focusRequest.current = null
    if (!request) return
    const index = items.findIndex((item) => item.id === request.id)
    if (index < 0) return
    const row = moveButtons.current.get(request.id)
    if (!row) return
    const usedDisabled = request.button === 'up' ? index === 0 : index === items.length - 1
    if (!usedDisabled) return
    const other = request.button === 'up' ? row.down : row.up
    other?.focus()
  }, [items])

  /**
   * Initiates a drag operation, storing the dragged item id in the transfer payload.
   * @param id
   * @param e
   */
  function onDragStart(id: string, e: DragEvent): void {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(id)
  }
  /**
   * Marks the hovered item as the current drop target and allows the drop.
   * @param id
   * @param e
   */
  function onDragOver(id: string, e: DragEvent): void {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverId(id)
  }
  /**
   * Handles a drop event by computing the new item order and calling onReorder.
   * @param targetId
   * @param e
   */
  function onDrop(targetId: string, e: DragEvent): void {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) {
      reset()
      return
    }
    const from = items.findIndex((i) => i.id === sourceId)
    const to = items.findIndex((i) => i.id === targetId)
    if (from < 0 || to < 0) {
      reset()
      return
    }
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder(next)
    reset()
  }
  /**
   * Clears dragging and over-target state after a drop or drag-end event.
   */
  function reset(): void {
    setDraggingId(null)
    setOverId(null)
  }

  return (
    <ul className={cm.cn(cm.stack(1 as const), className)}>
      {items.map((item, index) => {
        const isDragging = draggingId === item.id
        const isOver = overId === item.id && draggingId !== item.id
        const positionId = `${baseId}-position-${index}`
        const position = t(
          'reorderableList.position',
          { index: index + 1, total: items.length },
          { defaultValue: 'Item {{index}} of {{total}}' },
        )
        return (
          <li
            key={item.id}
            draggable={!renderHandle}
            onDragStart={renderHandle ? undefined : (e) => onDragStart(item.id, e)}
            onDragEnd={reset}
            onDragOver={(e) => onDragOver(item.id, e)}
            onDrop={(e) => onDrop(item.id, e)}
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
            style={{
              opacity: isDragging ? 0.4 : 1,
              borderTop: isOver ? '2px solid currentColor' : undefined,
            }}
          >
            {renderHandle && (
              <span
                draggable
                onDragStart={(e) => onDragStart(item.id, e)}
                onDragEnd={reset}
                className={cm.cursorPointer}
                aria-label={t(
                  'reorderableList.dragHandle',
                  {},
                  { defaultValue: 'Drag to reorder' },
                )}
              >
                {renderHandle()}
              </span>
            )}
            <div className={cm.flex1}>{renderItem(item, isDragging)}</div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <button
                type="button"
                data-mol-id={`reorderable-move-up-${item.id}`}
                ref={registerMoveButton(item.id, 'up')}
                onClick={() => moveFromButton(item.id, index, -1, 'up')}
                onKeyDown={(e) => onButtonKeyDown(item.id, index, 'up', e)}
                disabled={index === 0}
                aria-label={t('reorderableList.moveUp', {}, { defaultValue: 'Move up' })}
                aria-describedby={positionId}
                className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
              >
                <span aria-hidden="true">↑</span>
              </button>
              <button
                type="button"
                data-mol-id={`reorderable-move-down-${item.id}`}
                ref={registerMoveButton(item.id, 'down')}
                onClick={() => moveFromButton(item.id, index, 1, 'down')}
                onKeyDown={(e) => onButtonKeyDown(item.id, index, 'down', e)}
                disabled={index === items.length - 1}
                aria-label={t('reorderableList.moveDown', {}, { defaultValue: 'Move down' })}
                aria-describedby={positionId}
                className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
              >
                <span aria-hidden="true">↓</span>
              </button>
            </div>
            <span id={positionId} className={cm.srOnly}>
              {position}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
