import type { DragEvent, DragEventHandler } from 'react'

import type { DragEndEvent } from '@molecule/app-drag-drop'

const KANBAN_TRANSFER = 'text/molecule-kanban'

/** Keeps the HTML5 source bindings on the card's existing web wrapper. */
export function cardDragProps(onDragStart: DragEventHandler<HTMLDivElement>): {
  draggable: boolean
  onDragStart: DragEventHandler<HTMLDivElement>
} {
  return { draggable: true, onDragStart }
}

/** Keeps the HTML5 target bindings on the column's existing web section. */
export function columnDropProps(onDrop: DragEventHandler<HTMLElement> | undefined): {
  onDragOver?: DragEventHandler<HTMLElement>
  onDrop?: DragEventHandler<HTMLElement>
} {
  return onDrop ? { onDragOver: (event) => event.preventDefault(), onDrop } : {}
}

/** Writes the existing kanban transfer format. */
export function writeCardDrag(event: DragEvent, id: string, fromColumnId: string): void {
  event.stopPropagation()
  event.dataTransfer.setData(KANBAN_TRANSFER, JSON.stringify({ cardId: id, fromColumnId }))
  event.dataTransfer.effectAllowed = 'move'
}

/** Translates an HTML5 drop into the shared ID-based event. */
export function readCardDrop(event: DragEvent, targetId: string): DragEndEvent | undefined {
  event.preventDefault()
  const raw = event.dataTransfer.getData(KANBAN_TRANSFER)
  if (!raw) return undefined
  // A nested board owns drops in its column, including a rejected transfer.
  event.stopPropagation()
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch (_error) {
    // DataTransfer can contain arbitrary external text. Malformed JSON cancels the drop.
    return undefined
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('cardId' in payload) ||
    typeof payload.cardId !== 'string' ||
    !('fromColumnId' in payload) ||
    typeof payload.fromColumnId !== 'string'
  ) {
    return undefined
  }
  return { id: payload.cardId, overId: targetId, data: payload.fromColumnId }
}
