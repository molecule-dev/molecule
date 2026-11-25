import type { JSX } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

import type { ActivityFeedItemData } from './types.js'

/** Props for {@link ActivityFeedItem}. */
export interface ActivityFeedItemProps {
  item: ActivityFeedItemData
  /** Extra classes on the row wrapper. */
  className?: string
}

/**
 * One entry in an `<ActivityFeed>`.
 *
 * Shape: `[avatar|icon] [actor verb target · timestamp] [body]`.
 * @param props - Component props (see {@link ActivityFeedItemProps}).
 */
export function ActivityFeedItem({ item, className }: ActivityFeedItemProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Box as="article" className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), className)}>
      <Box as="div" className={cm.shrink0}>
        {item.icon ?? (item.avatarSrc ? <Avatar src={item.avatarSrc} size="sm" /> : null)}
      </Box>
      <Box as="div" className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <Box as="div" className={cm.cn(cm.textSize('sm'))}>
          <Text as="span" className={cm.fontWeight('semibold')}>
            {item.actor}
          </Text>{' '}
          {item.verb}{' '}
          {item.target && (
            <Text as="span" className={cm.fontWeight('medium')}>
              {item.target}
            </Text>
          )}
          <Text as="span" className={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}>
            {' '}
            · {item.timestamp}
          </Text>
        </Box>
        {item.body && (
          <Box as="div" className={cm.textSize('sm')}>
            {item.body}
          </Box>
        )}
      </Box>
    </Box>
  )
}
