import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface TableToolbarProps {
  /** Left-aligned content — usually a title or a results count. */
  left?: ReactNode
  /** Right-aligned actions — search input, filter button, export, etc. */
  right?: ReactNode
  /** Optional full-width filter / chip row rendered below the main row. */
  below?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Table top-chrome row with left/right slots and an optional bottom
 * sub-row for active filter chips or tabs. Sits above an `<Table>`
 * from `@molecule/app-ui-react`.
 * @param props - Component props (see {@link TableToolbarProps}).
 */
export function TableToolbar({ left, right, below, className }: TableToolbarProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.stack(2), className)}>
      <div className={cm.flex({ justify: 'between', align: 'center', gap: 'sm', wrap: 'wrap' })}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>{left}</div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>{right}</div>
      </div>
      {below}
    </div>
  )
}
