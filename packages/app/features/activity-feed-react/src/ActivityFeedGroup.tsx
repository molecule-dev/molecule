import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

import { ActivityFeedItem } from './ActivityFeedItem.js'
import type { ActivityFeedItemData } from './types.js'

/** Props for {@link ActivityFeedGroup}. */
export interface ActivityFeedGroupProps {
  /** Group heading — typically a formatted date ("Today", "Yesterday", "Mar 12"). */
  heading: ReactNode
  /** Items in this group. */
  items: ActivityFeedItemData[]
  /** Extra classes. */
  className?: string
}

/**
 * Date-grouped activity section — a heading followed by a stack of items.
 * Compose multiple `<ActivityFeedGroup>`s together for an organized
 * "Today / Yesterday / Last week" feed.
 * @param props - Component props (see {@link ActivityFeedGroupProps}).
 */
export function ActivityFeedGroup({
  heading,
  items,
  className,
}: ActivityFeedGroupProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Box as="section" className={cm.cn(cm.stack(3), className)}>
      <Text as="h3" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
        {heading}
      </Text>
      <Box as="div" className={cm.stack(4)}>
        {items.map((it) => (
          <ActivityFeedItem key={it.id} item={it} />
        ))}
      </Box>
    </Box>
  )
}
