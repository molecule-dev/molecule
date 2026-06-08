import type { DragEvent, ReactElement, ReactNode } from 'react'
import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 * A single item in a ReorderableList, pairing a stable string id with arbitrary data.
 */
export interface ReorderableItem<T> {
  id: string
  data: T
}

interface ReorderableListProps<T> {
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
 * Drag-handle reorderable list with HTML5 DnD. Apps own the data; this
 * component only renders + emits new order on `onReorder`.
 *
 * Use the optional `renderHandle` slot to limit drag to a specific
 * element (e.g. a "≡" handle on the left).
 * @param root0
 * @param root0.items
 * @param root0.onReorder
 * @param root0.renderItem
 * @param root0.renderHandle
 * @param root0.className
 */
export function ReorderableList<T>({
  items,
  onReorder,
  renderItem,
  renderHandle,
  className,
}: ReorderableListProps<T>): ReactElement {
  const cm = getClassMap()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

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
      {items.map((item) => {
        const isDragging = draggingId === item.id
        const isOver = overId === item.id && draggingId !== item.id
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
                aria-label="Drag to reorder"
              >
                {renderHandle()}
              </span>
            )}
            <div className={cm.flex1}>{renderItem(item, isDragging)}</div>
          </li>
        )
      })}
    </ul>
  )
}
