/**
 * Solid table footer bar.
 *
 * Solid counterpart of `@molecule/app-data-table-ui-react`'s `TableFooter` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { TableFooterProps } from './types.js'

/**
 * Footer bar rendered below a table. Pass a pagination bar in `right`.
 *
 * @param props - Component props (see {@link TableFooterProps}).
 * @returns The rendered footer.
 */
export function TableFooter(props: TableFooterProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      class={cm.cn(
        cm.flex({ justify: 'between', align: 'center', gap: 'sm', wrap: 'wrap' }),
        cm.sp('pt', 3),
        props.className,
      )}
    >
      <div>{props.left}</div>
      <div>{props.right}</div>
    </div>
  )
}
