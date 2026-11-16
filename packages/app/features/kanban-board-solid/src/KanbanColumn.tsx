/**
 * Solid Kanban column — sticky header + card list + optional footer.
 *
 * Solid counterpart of `@molecule/app-kanban-board-react`'s `KanbanColumn`: the
 * same props (React names) and the same DOM for the same input. The drop
 * handlers exist only when `onDrop` is supplied, exactly as React gates them.
 *
 * @module
 */

import { type Component, For } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { KanbanCard } from './KanbanCard.jsx'
import { KanbanColumnHeader } from './KanbanColumnHeader.jsx'
import type { KanbanColumnProps } from './types.js'

/**
 * One Kanban column — header + card list + optional footer.
 *
 * @param props - Component props (see {@link KanbanColumnProps}).
 * @returns The rendered column.
 */
export const KanbanColumn: Component<KanbanColumnProps> = (props) => {
  const cm = getClassMap()
  return (
    <section
      class={cm.cn(cm.stack(2), props.className)}
      onDragOver={props.onDrop ? (event: DragEvent) => event.preventDefault() : undefined}
      onDrop={props.onDrop ? (event: DragEvent) => props.onDrop?.(props.column, event) : undefined}
    >
      <KanbanColumnHeader
        title={props.column.title}
        count={props.column.cards.length}
        actions={props.headerActions}
      />
      <div class={cm.cn(cm.stack(2))}>
        <For each={props.column.cards}>
          {(card) => (
            <KanbanCard
              card={card}
              onClick={
                props.onCardClick
                  ? (clicked) => props.onCardClick?.(clicked, props.column)
                  : undefined
              }
              onDragStart={
                props.onCardDragStart
                  ? (dragged, event) => props.onCardDragStart?.(dragged, props.column, event)
                  : undefined
              }
            />
          )}
        </For>
      </div>
      {props.footer}
    </section>
  )
}
