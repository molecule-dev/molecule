import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link LeaderboardList}. */
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
  title: titleProp,
  actions,
  emptyState,
  className,
}: LeaderboardListProps): JSX.Element {
  const title = slot(titleProp)
  const cm = getClassMap()
  const childCount = Array.isArray(children) ? children.length : children ? 1 : 0
  return (
    <Box as="div" className={cm.cn(cm.stack(2), className)}>
      {(title || actions) && (
        <Box as="header" className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          {title && (
            <Text as="h3" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {title}
            </Text>
          )}
          {actions}
        </Box>
      )}
      {childCount === 0 ? (
        emptyState
      ) : (
        <Box as="div" className={cm.stack(1 as const)}>
          {children}
        </Box>
      )}
    </Box>
  )
}
