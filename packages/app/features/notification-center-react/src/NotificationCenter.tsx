import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/**
 *
 */
export interface NotificationItem {
  id: string
  title: ReactNode
  body?: ReactNode
  /** Display timestamp. */
  timestamp?: ReactNode
  /** Optional leading icon / avatar. */
  leading?: ReactNode
  /** Whether the user has read this. */
  read?: boolean
  /** Click handler — typically navigates and marks as read. */
  onClick?: () => void
}

interface NotificationCenterProps {
  /** Items to render. */
  items: NotificationItem[]
  /** Called when "Mark all as read" is clicked. Hides the link if omitted. */
  onMarkAllRead?: () => void
  /** Called when "View all" is clicked. */
  onViewAll?: () => void
  /** Empty-state node when items is empty. */
  emptyState?: ReactNode
  /** Title at the top of the panel. */
  title?: ReactNode
  /** Extra classes on the panel wrapper. */
  className?: string
}

/**
 * Standalone notification panel — title + mark-all-read action +
 * scrollable item list + footer "View all". Drop inside a popover /
 * dropdown / drawer to make a full notification center.
 * @param root0
 * @param root0.items
 * @param root0.onMarkAllRead
 * @param root0.onViewAll
 * @param root0.emptyState
 * @param root0.title
 * @param root0.className
 */
export function NotificationCenter({
  items,
  onMarkAllRead,
  onViewAll,
  emptyState,
  title,
  className,
}: NotificationCenterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const hasItems = items.length > 0
  return (
    <div
      className={cm.cn(cm.stack(0 as const), className)}
      style={{ minWidth: 320, maxHeight: 480, overflowY: 'auto' }}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('p', 3),
        )}
      >
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {title ?? t('notifications.title', {}, { defaultValue: 'Notifications' })}
        </h3>
        {onMarkAllRead && hasItems && (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
            {t('notifications.markAllRead', {}, { defaultValue: 'Mark all as read' })}
          </Button>
        )}
      </header>
      {!hasItems ? (
        (emptyState ?? (
          <div className={cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm'))}>
            {t('notifications.empty', {}, { defaultValue: 'No notifications' })}
          </div>
        ))
      ) : (
        <ul className={cm.stack(0 as const)}>
          {items.map((it) => (
            <li
              key={it.id}
              onClick={it.onClick}
              className={cm.cn(
                cm.flex({ align: 'start', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                it.onClick ? cm.cursorPointer : undefined,
              )}
              style={!it.read ? { background: 'rgba(96,165,250,0.08)' } : undefined}
            >
              {it.leading && <div className={cm.shrink0}>{it.leading}</div>}
              <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    it.read ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
                  )}
                >
                  {it.title}
                </span>
                {it.body && <span className={cm.textSize('xs')}>{it.body}</span>}
                {it.timestamp && <span className={cm.textSize('xs')}>{it.timestamp}</span>}
              </div>
              {!it.read && (
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#60a5fa',
                    marginTop: 6,
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {onViewAll && hasItems && (
        <footer className={cm.cn(cm.sp('p', 2), cm.textCenter)}>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            {t('notifications.viewAll', {}, { defaultValue: 'View all' })}
          </Button>
        </footer>
      )}
    </div>
  )
}
