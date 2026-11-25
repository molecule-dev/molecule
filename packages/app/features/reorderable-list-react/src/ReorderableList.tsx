import type { ReactElement, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'

import type { DragEndEvent } from '@molecule/app-drag-drop'
import { useDragDropRenderer } from '@molecule/app-drag-drop/react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

import { focusOtherMoveButton, rowDropProps, sourceDragProps } from './web-drag.js'

const MOVE_BUTTONS: readonly ('up' | 'down')[] = ['up', 'down']

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
 * Drag-handle reorderable list with accessible move buttons. Apps own the
 * data and receive the new order on `onReorder`.
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
  const renderer = useDragDropRenderer()
  const { Scope: DragScope, Source: DragSource, Target: DropTarget } = renderer ?? {}
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  /** The list's id prefix; each row's position span is `${baseId}-position-${index}`. */
  const baseId = useId()
  /** The move whose focus settles once `items` changes: the item id and the button used. */
  const focusRequest = useRef<{
    id: string
    button: 'up' | 'down'
    focusOther?: () => void
  } | null>(null)

  /** Resolves gesture and button moves against the list currently on screen. */
  function finishDrag({ id, overId }: DragEndEvent): void {
    setDraggingId(null)
    setOverId(null)
    if (overId === undefined || id === overId) return
    const from = items.findIndex((item) => item.id === id)
    const to = items.findIndex((item) => item.id === overId)
    if (from < 0 || to < 0) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder(next)
  }

  /**
   * Moves the item with a button or Alt+Arrow and records where focus should go.
   * @param index - Current position of the item to move.
   * @param delta - -1 to move up, 1 to move down.
   * @param button - The button the move came from.
   * @param target - The activated button, if the renderer exposes it.
   */
  function moveFromButton(
    index: number,
    delta: -1 | 1,
    button: 'up' | 'down',
    target: EventTarget | null,
  ): void {
    const from = items[index]
    const to = items[index + delta]
    if (!from || !to) return
    focusRequest.current = { id: from.id, button, focusOther: focusOtherMoveButton(target, button) }
    finishDrag({ id: from.id, overId: to.id })
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
    const usedDisabled = request.button === 'up' ? index === 0 : index === items.length - 1
    if (usedDisabled) request.focusOther?.()
  }, [items])

  const drag = {
    start: ({ id }: { id: string }) => setDraggingId(id),
    hover: (id: string) => setOverId(id),
    end: finishDrag,
  }

  /** Native accessibility does not map `aria-describedby`, so include the position in the name. */
  function moveLabel(action: string, position: string): string {
    return renderer
      ? t(
          'ui.dragDrop.moveAtPosition',
          { action, position },
          { defaultValue: '{{action}}, {{position}}' },
        )
      : action
  }

  const list = (
    <Box as="ul" className={cm.cn(cm.stack(1), className)}>
      {items.map((item, index) => {
        const isDragging = draggingId === item.id
        const isOver = overId === item.id && draggingId !== item.id
        const positionId = `${baseId}-position-${index}`
        const position = t(
          'reorderableList.position',
          { index: index + 1, total: items.length },
          { defaultValue: 'Item {{index}} of {{total}}' },
        )
        const source = { id: item.id }
        const handle = renderHandle && (
          <Box
            as="span"
            {...(renderer ? {} : sourceDragProps(item.id, true, drag))}
            className={cm.cursorPointer}
            aria-label={t('reorderableList.dragHandle', {}, { defaultValue: 'Drag to reorder' })}
          >
            {renderHandle()}
          </Box>
        )
        const row = (
          <Box
            as="li"
            key={item.id}
            {...(renderer ? {} : sourceDragProps(item.id, !renderHandle, drag))}
            {...(renderer ? {} : rowDropProps(item.id, drag))}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              renderer && isOver && cm.borderTPrimary,
            )}
            style={{ opacity: isDragging ? 0.4 : 1 }}
            webStyle={{ borderTop: isOver ? '2px solid currentColor' : undefined }}
          >
            {DragSource && handle ? <DragSource source={source}>{handle}</DragSource> : handle}
            <Box as="div" className={cm.flex1}>
              {renderItem(item, isDragging)}
            </Box>
            <Box as="div" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              {MOVE_BUTTONS.map((button) => (
                <Pressable
                  as="button"
                  key={button}
                  type="button"
                  data-mol-id={`reorderable-move-${button}-${item.id}`}
                  onClick={(event) =>
                    moveFromButton(index, button === 'up' ? -1 : 1, button, event.currentTarget)
                  }
                  onKeyDown={(event) => {
                    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown'))
                      return
                    event.preventDefault()
                    moveFromButton(
                      index,
                      event.key === 'ArrowUp' ? -1 : 1,
                      button,
                      event.currentTarget,
                    )
                  }}
                  disabled={button === 'up' ? index === 0 : index === items.length - 1}
                  aria-label={moveLabel(
                    button === 'up'
                      ? t('reorderableList.moveUp', {}, { defaultValue: 'Move up' })
                      : t('reorderableList.moveDown', {}, { defaultValue: 'Move down' }),
                    position,
                  )}
                  aria-describedby={positionId}
                  className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
                >
                  <Text as="span" aria-hidden="true">
                    {button === 'up' ? '↑' : '↓'}
                  </Text>
                </Pressable>
              ))}
            </Box>
            <Text as="span" id={positionId} className={cm.srOnly}>
              {position}
            </Text>
          </Box>
        )
        return DropTarget ? (
          <DropTarget key={item.id} id={item.id}>
            {DragSource && !renderHandle ? <DragSource source={source}>{row}</DragSource> : row}
          </DropTarget>
        ) : (
          row
        )
      })}
    </Box>
  )
  return DragScope ? (
    <DragScope
      onDragStart={drag.start}
      onDragMove={({ overId }) => setOverId(overId ?? null)}
      onDragEnd={drag.end}
    >
      {list}
    </DragScope>
  ) : (
    list
  )
}
