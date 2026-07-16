import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface TableEmptyProps {
  /** Number of columns to span (for colspan on the td). */
  colSpan: number
  /** Empty-state content. */
  children: ReactNode
  /** Extra classes on the cell. */
  className?: string
}

/**
 * Single full-width row shown when a `<Table>` has no data. Typically
 * wraps `<EmptyState>` from `@molecule/app-empty-state-react`.
 * @param props - Component props (see {@link TableEmptyProps}).
 */
export function TableEmpty({ colSpan, children, className }: TableEmptyProps): JSX.Element {
  const cm = getClassMap()
  return (
    <tr>
      <td colSpan={colSpan} className={cm.cn(cm.sp('py', 10), cm.textCenter, className)}>
        {children}
      </td>
    </tr>
  )
}
