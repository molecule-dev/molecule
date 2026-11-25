import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link KanbanColumnHeader}. */
export interface KanbanColumnHeaderProps {
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
 * @param props - Component props (see {@link KanbanColumnHeaderProps}).
 */
export function KanbanColumnHeader({
  title,
  count,
  actions,
  className,
}: KanbanColumnHeaderProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Box
      as="header"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('pb', 2),
        className,
      )}
    >
      <Box as="div" className={cm.flex({ align: 'center', gap: 'xs' })}>
        <Text as="span" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {title}
        </Text>
        {typeof count === 'number' && (
          <Text as="span" className={cm.textSize('xs')}>
            ({count})
          </Text>
        )}
      </Box>
      {actions}
    </Box>
  )
}
