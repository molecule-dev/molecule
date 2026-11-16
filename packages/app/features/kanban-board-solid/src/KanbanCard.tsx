/**
 * Solid Kanban card — a `Card` with the card's title, optional body and footer.
 *
 * Solid counterpart of `@molecule/app-kanban-board-react`'s `KanbanCard`: the
 * same props (React names) and the same DOM for the same input. Drag-drop is
 * opt-in via `onDragStart` — with it the card gains the same outer
 * `draggable` div React renders; without it the `Card` itself is the root.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { KanbanCardProps } from './types.js'

/**
 * Single card inside a Kanban column.
 *
 * @param props - Component props (see {@link KanbanCardProps}).
 * @returns The rendered card.
 */
export const KanbanCard: Component<KanbanCardProps> = (props) => {
  const cm = getClassMap()

  const body = (): JSX.Element => (
    <Card
      className={cm.cn(cm.cursorPointer, props.className)}
      onClick={() => props.onClick?.(props.card)}
    >
      <div class={cm.cn(cm.stack(2))}>
        <h4 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.card.title}</h4>
        {props.card.body ? <div class={cm.cn(cm.textSize('sm'))}>{props.card.body}</div> : null}
        {props.card.footer ? (
          <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>{props.card.footer}</div>
        ) : null}
      </div>
    </Card>
  )

  return (
    <>
      {props.onDragStart ? (
        <div draggable={true} onDragStart={(event) => props.onDragStart?.(props.card, event)}>
          {body()}
        </div>
      ) : (
        body()
      )}
    </>
  )
}
