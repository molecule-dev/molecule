import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from './ActivityFeedItem.js'
import type { ActivityFeedItemData } from './types.js'

interface ActivityFeedGroupProps {
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
 * @param root0
 * @param root0.heading
 * @param root0.items
 * @param root0.className
 */
export function ActivityFeedGroup({ heading, items, className }: ActivityFeedGroupProps) {
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.stack(3), className)}>
      <h3 className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{heading}</h3>
      <div className={cm.stack(4)}>
        {items.map((it) => (
          <ActivityFeedItem key={it.id} item={it} />
        ))}
      </div>
    </section>
  )
}
