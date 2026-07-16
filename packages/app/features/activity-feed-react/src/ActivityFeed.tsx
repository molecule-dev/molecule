import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from './ActivityFeedItem.js'
import type { ActivityFeedItemData } from './types.js'

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
  emptyState,
  footer,
  className,
}: ActivityFeedProps): JSX.Element {
  const cm = getClassMap()
  if (items.length === 0 && emptyState) return <>{emptyState}</>
  return (
    <div className={cm.cn(cm.stack(4), className)}>
      {items.map((it) => (
        <ActivityFeedItem key={it.id} item={it} />
      ))}
      {footer}
    </div>
  )
}
