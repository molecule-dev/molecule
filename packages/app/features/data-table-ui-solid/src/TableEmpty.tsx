/**
 * Solid single full-width empty row.
 *
 * Solid counterpart of `@molecule/app-data-table-ui-react`'s `TableEmpty` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { TableEmptyProps } from './types.js'

/**
 * Single full-width row shown when a table has no data. Typically wraps an
 * empty-state component.
 *
 * @param props - Component props (see {@link TableEmptyProps}).
 * @returns The rendered empty row.
 */
export function TableEmpty(props: TableEmptyProps): JSX.Element {
  const cm = getClassMap()
  return (
    <tr>
      <td colSpan={props.colSpan} class={cm.cn(cm.sp('py', 10), cm.textCenter, props.className)}>
        {props.children}
      </td>
    </tr>
  )
}
