import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface TableEmptyProps {
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
 * @param root0
 * @param root0.colSpan
 * @param root0.children
 * @param root0.className
 */
export function TableEmpty({ colSpan, children, className }: TableEmptyProps) {
  const cm = getClassMap()
  return (
    <tr>
      <td colSpan={colSpan} className={cm.cn(cm.sp('py', 10), cm.textCenter, className)}>
        {children}
      </td>
    </tr>
  )
}
