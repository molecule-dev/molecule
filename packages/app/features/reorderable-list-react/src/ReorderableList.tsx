import type { DragEvent, KeyboardEvent, ReactElement, ReactNode } from 'react'
import { useState } from 'react'

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
 * move-up/move-down buttons and supports Alt+ArrowUp / Alt+ArrowDown on the
 * focused row, so the list is fully reorderable without a mouse.
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
    <ul className={cm.cn(cm.stack(1 as const), className)} role="list">
      {items.map((item, index) => {
        const isDragging = draggingId === item.id
        const isOver = overId === item.id && draggingId !== item.id
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
            onKeyDown={(e) => onItemKeyDown(index, e)}
            tabIndex={0}
            aria-label={position}
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
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                aria-label={t('reorderableList.moveUp', {}, { defaultValue: 'Move up' })}
                className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
              >
                <span aria-hidden="true">↑</span>
              </button>
              <button
                type="button"
                data-mol-id={`reorderable-move-down-${item.id}`}
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                aria-label={t('reorderableList.moveDown', {}, { defaultValue: 'Move down' })}
                className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
              >
                <span aria-hidden="true">↓</span>
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
