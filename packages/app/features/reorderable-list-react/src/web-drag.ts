import type { HTMLAttributes } from 'react'

import type { DragEndEvent, DragStartEvent } from '@molecule/app-drag-drop'

const REORDER_TRANSFER = 'text/plain'

interface DragCallbacks {
  start: (event: DragStartEvent) => void
  hover: (id: string) => void
  end: (event: DragEndEvent) => void
}

type DragSourceProps = Pick<HTMLAttributes<HTMLElement>, 'draggable' | 'onDragStart' | 'onDragEnd'>

/** Places the existing HTML5 source bindings on a row or its optional handle. */
export function sourceDragProps(
  id: string,
  draggable: boolean,
  { start, end }: DragCallbacks,
): DragSourceProps {
  if (!draggable) return { draggable: false }
  return {
    draggable,
    onDragStart: (event) => {
      event.stopPropagation()
      event.dataTransfer.setData(REORDER_TRANSFER, id)
      event.dataTransfer.effectAllowed = 'move'
      start({ id })
    },
    onDragEnd: (event) => {
      event.stopPropagation()
      end({ id })
    },
  }
}

/** Keeps the HTML5 drop target on the existing list row. */
export function rowDropProps(
  id: string,
  { hover, end }: DragCallbacks,
): Pick<HTMLAttributes<HTMLElement>, 'onDragOver' | 'onDrop'> {
  return {
    onDragOver: (event) => {
      event.preventDefault()
      if (event.dataTransfer.types?.includes(REORDER_TRANSFER)) event.stopPropagation()
      event.dataTransfer.dropEffect = 'move'
      hover(id)
    },
    onDrop: (event) => {
      event.preventDefault()
      const sourceId = event.dataTransfer.getData(REORDER_TRANSFER)
      if (sourceId) event.stopPropagation()
      end(sourceId ? { id: sourceId, overId: id } : { id })
    },
  }
}

/** Captures the other button on this row, so focus can follow the item after a move. */
export function focusOtherMoveButton(
  target: EventTarget | null,
  used: 'up' | 'down',
): (() => void) | undefined {
  if (!target) return undefined
  const other =
    used === 'up'
      ? 'nextElementSibling' in target && target.nextElementSibling
      : 'previousElementSibling' in target && target.previousElementSibling
  if (!other || typeof other !== 'object' || !('focus' in other)) return undefined
  const { focus } = other
  return typeof focus === 'function' ? () => focus.call(other) : undefined
}
