/**
 * Solid `<tr>` wrapper with a trailing actions cell.
 *
 * Solid counterpart of `@molecule/app-data-table-ui-react`'s `RowWithActions` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { RowWithActionsProps } from './types.js'

/**
 * `<tr>` wrapper that adds a trailing actions cell plus a click handler on the
 * body. Useful for data tables where each row has a trailing ellipsis-menu or a
 * row of action buttons.
 *
 * @param props - Component props (see {@link RowWithActionsProps}).
 * @returns The rendered row.
 */
export function RowWithActions(props: RowWithActionsProps): JSX.Element {
  const cm = getClassMap()
  return (
    <tr
      onClick={props.onClick}
      aria-selected={props.selected}
      class={cm.cn(props.onClick ? cm.cursorPointer : undefined, props.className)}
    >
      {props.children}
      <Show when={props.actions !== undefined}>
        <td onClick={(event) => event.stopPropagation()} class={cm.cn(cm.textCenter)}>
          {props.actions}
        </td>
      </Show>
    </tr>
  )
}
