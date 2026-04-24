import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

import type { ActivityFeedItemData } from './types.js'

interface ActivityFeedItemProps {
  item: ActivityFeedItemData
  /** Extra classes on the row wrapper. */
  className?: string
}

/**
 * One entry in an `<ActivityFeed>`.
 *
 * Shape: `[avatar|icon] [actor verb target · timestamp] [body]`.
 * @param root0
 * @param root0.item
 * @param root0.className
 */
export function ActivityFeedItem({ item, className }: ActivityFeedItemProps) {
  const cm = getClassMap()
  return (
    <article className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), className)}>
      <div className={cm.shrink0}>
        {item.icon ?? (item.avatarSrc ? <Avatar src={item.avatarSrc} size="sm" /> : null)}
      </div>
      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <div className={cm.cn(cm.textSize('sm'))}>
          <span className={cm.fontWeight('semibold')}>{item.actor}</span> {item.verb}{' '}
          {item.target && <span className={cm.fontWeight('medium')}>{item.target}</span>}
          <span className={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}> · {item.timestamp}</span>
        </div>
        {item.body && <div className={cm.textSize('sm')}>{item.body}</div>}
      </div>
    </article>
  )
}
