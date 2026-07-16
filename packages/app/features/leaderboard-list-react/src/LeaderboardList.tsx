import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface LeaderboardListProps {
  /** Pre-rendered leaderboard rows. */
  children: ReactNode
  /** Optional title above the list. */
  title?: ReactNode
  /** Optional period selector / actions row. */
  actions?: ReactNode
  /** Optional empty state. */
  emptyState?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Container above a stack of `<LeaderboardRow>`s — header + actions +
 * scrollable list. Doesn't itself render rank logic; pair with
 * `<LeaderboardRow>` from `@molecule/app-leaderboard-row-react`.
 * @param props - Component props (see {@link LeaderboardListProps}).
 */
export function LeaderboardList({
  children,
  title,
  actions,
  emptyState,
  className,
}: LeaderboardListProps): JSX.Element {
  const cm = getClassMap()
  const childCount = Array.isArray(children) ? children.length : children ? 1 : 0
  return (
    <div className={cm.cn(cm.stack(2), className)}>
      {(title || actions) && (
        <header className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          {title && (
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{title}</h3>
          )}
          {actions}
        </header>
      )}
      {childCount === 0 ? emptyState : <div className={cm.stack(1 as const)}>{children}</div>}
    </div>
  )
}
