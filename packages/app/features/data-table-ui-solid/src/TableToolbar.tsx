/**
 * Solid table top-chrome toolbar.
 *
 * Solid counterpart of `@molecule/app-data-table-ui-react`'s `TableToolbar` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { TableToolbarProps } from './types.js'

/**
 * Table top-chrome row with left/right slots and an optional bottom sub-row for
 * active filter chips or tabs. Sits above the table.
 *
 * @param props - Component props (see {@link TableToolbarProps}).
 * @returns The rendered toolbar.
 */
export function TableToolbar(props: TableToolbarProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      <div class={cm.flex({ justify: 'between', align: 'center', gap: 'sm', wrap: 'wrap' })}>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>{props.left}</div>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>{props.right}</div>
      </div>
      {props.below}
    </div>
  )
}
