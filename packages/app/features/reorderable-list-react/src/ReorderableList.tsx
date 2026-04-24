import type { DragEvent, ReactNode } from 'react'
import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
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
}: ReorderableListProps<T>) {
  const cm = getClassMap()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  /**
   *
   * @param id
   * @param e
   */
  function onDragStart(id: string, e: DragEvent) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(id)
  }
  /**
   *
   * @param id
   * @param e
   */
  function onDragOver(id: string, e: DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverId(id)
  }
  /**
   *
   * @param targetId
   * @param e
   */
  function onDrop(targetId: string, e: DragEvent) {
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
   *
   */
  function reset() {
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
