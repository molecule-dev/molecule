/**
 * Solid Kanban column heading row — title + count + right actions.
 *
 * Solid counterpart of `@molecule/app-kanban-board-react`'s
 * `KanbanColumnHeader`: the same props (React names) and the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { KanbanColumnHeaderProps } from './types.js'

/**
 * Kanban column heading row — title + count + right actions.
 *
 * @param props - Component props (see {@link KanbanColumnHeaderProps}).
 * @returns The rendered heading.
 */
export const KanbanColumnHeader: Component<KanbanColumnHeaderProps> = (props) => {
  const cm = getClassMap()
  return (
    <header
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('pb', 2),
        props.className,
      )}
    >
      <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.title}</span>
        {typeof props.count === 'number' ? (
          <span class={cm.cn(cm.textSize('xs'))}>{`(${props.count})`}</span>
        ) : null}
      </div>
      {props.actions}
    </header>
  )
}
