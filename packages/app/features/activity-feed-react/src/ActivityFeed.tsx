import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

import { ActivityFeedItem } from './ActivityFeedItem.js'
import type { ActivityFeedItemData } from './types.js'

/** Props for {@link ActivityFeed}. */
export interface ActivityFeedProps {
  /** Items in display order (usually most-recent first). */
  items: ActivityFeedItemData[]
  /** Rendered when `items` is empty. */
  emptyState?: ReactNode
  /** Optional footer (e.g. "Load more"). */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Simple activity feed — renders each `ActivityFeedItemData` via
 * `<ActivityFeedItem>` and stacks them. For date-grouped feeds use
 * `<ActivityFeedGroup>`.
 * @param props - Component props (see {@link ActivityFeedProps}).
 */
export function ActivityFeed({
  items,
  emptyState: emptyStateProp,
  footer,
  className,
}: ActivityFeedProps): JSX.Element {
  const emptyState = slot(emptyStateProp)
  const cm = getClassMap()
  if (items.length === 0 && emptyState) return <>{emptyState}</>
  return (
    <Box as="div" className={cm.cn(cm.stack(4), className)}>
      {items.map((it) => (
        <ActivityFeedItem key={it.id} item={it} />
      ))}
      {footer}
    </Box>
  )
}
