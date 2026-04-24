import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface TableFooterProps {
  /** Left slot — typically a summary line ("5 rows selected"). */
  left?: ReactNode
  /** Right slot — typically `<PaginationBar>`. */
  right?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Footer bar rendered below an `<Table>`. Pass a pagination bar in `right`.
 * @param root0
 * @param root0.left
 * @param root0.right
 * @param root0.className
 */
export function TableFooter({ left, right, className }: TableFooterProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center', gap: 'sm', wrap: 'wrap' }),
        cm.sp('pt', 3),
        className,
      )}
    >
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}
