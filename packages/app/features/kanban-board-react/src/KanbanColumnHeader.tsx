import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface KanbanColumnHeaderProps {
  title: ReactNode
  /** Card count shown in parentheses. */
  count?: number
  /** Optional right-side actions (add card button, menu). */
  actions?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Kanban column heading row — title + count + right actions.
 * @param root0
 * @param root0.title
 * @param root0.count
 * @param root0.actions
 * @param root0.className
 */
export function KanbanColumnHeader({ title, count, actions, className }: KanbanColumnHeaderProps) {
  const cm = getClassMap()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('pb', 2),
        className,
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'xs' })}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{title}</span>
        {typeof count === 'number' && <span className={cm.textSize('xs')}>({count})</span>}
      </div>
      {actions}
    </header>
  )
}
