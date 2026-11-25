import type { ReactElement, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button } from '@molecule/app-ui-react'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

/** A single notification entry rendered inside the notification panel. */
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

/** Props for {@link NotificationCenter}. */
export interface NotificationCenterProps {
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
  /**
   * The error from the most recent failed fetch (mirrors
   * `NotificationCenterState.lastError` from `@molecule/app-notification-center`).
   * When set, an error banner with a retry action renders above the list —
   * a stale-but-populated `items` list with a currently-failing background
   * poll must still surface the failure, so the banner never replaces the
   * list or the empty state.
   */
  lastError?: Error
  /**
   * Called when the user clicks "Retry" in the error banner. Typically
   * wired to the notification center instance's `refresh()`.
   */
  onRetry?: () => void
}

/**
 * Standalone notification panel — title + mark-all-read action +
 * scrollable item list + footer "View all". Drop inside a popover /
 * dropdown / drawer to make a full notification center.
 * @param props - Component props (see {@link NotificationCenterProps}).
 */
export function NotificationCenter({
  items,
  onMarkAllRead,
  onViewAll,
  emptyState: emptyStateProp,
  title: titleProp,
  className,
  lastError,
  onRetry,
}: NotificationCenterProps): ReactElement {
  const emptyState = slot(emptyStateProp)
  const title = slot(titleProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  const hasItems = items.length > 0
  return (
    <Box
      as="div"
      className={cm.cn(cm.stack(0 as const), className)}
      webStyle={{ minWidth: 320, maxHeight: 480, overflowY: 'auto' }}
    >
      <Box
        as="header"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('p', 3),
        )}
      >
        <Text as="h3" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {title ?? t('notifications.title', {}, { defaultValue: 'Notifications' })}
        </Text>
        {onMarkAllRead && hasItems && (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
            {t('notifications.markAllRead', {}, { defaultValue: 'Mark all as read' })}
          </Button>
        )}
      </Box>
      {lastError && (
        <Box as="div" className={cm.sp('px', 3)}>
          <Alert status="error">
            <Box as="div" className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
              <Text as="span" className={cm.textSize('sm')}>
                {t(
                  'notifications.loadError',
                  {},
                  { defaultValue: 'Could not load notifications.' },
                )}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                data-mol-id="notification-center-retry"
              >
                {t('notifications.retry', {}, { defaultValue: 'Retry' })}
              </Button>
            </Box>
          </Alert>
        </Box>
      )}
      {!hasItems ? (
        (emptyState ?? (
          <Box as="div" className={cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm'))}>
            {t('notifications.empty', {}, { defaultValue: 'No notifications' })}
          </Box>
        ))
      ) : (
        <Box as="ul" className={cm.stack(0 as const)}>
          {items.map((it) => (
            <Box as="li" key={it.id}>
              {/* A `li` cannot take button semantics, so the row is a wrapper
                  around its content: when the item is clickable it is a button
                  in the a11y tree (role + tabIndex + Enter / Space activation,
                  matching native button keyboard semantics); otherwise it is the
                  plain row div. */}
              <Pressable
                as="div"
                role={it.onClick ? 'button' : undefined}
                tabIndex={it.onClick ? 0 : undefined}
                onClick={it.onClick}
                onKeyDown={
                  it.onClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          it.onClick?.()
                        }
                      }
                    : undefined
                }
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  it.onClick ? cm.cursorPointer : undefined,
                  it.read ? undefined : cm.bgPrimarySubtle,
                )}
              >
                {it.leading && (
                  <Box as="div" className={cm.shrink0}>
                    {it.leading}
                  </Box>
                )}
                <Box as="div" className={cm.cn(cm.flex1, cm.stack(0 as const))}>
                  {/* The unread state is announced, not only shown: a screen
                      reader reads "Unread" before the title (WCAG 1.3.1). */}
                  {!it.read && (
                    <Text as="span" className={cm.cn(cm.srOnly)}>
                      {t('notifications.unread', {}, { defaultValue: 'Unread' })}
                    </Text>
                  )}
                  <Box
                    as="span"
                    className={cm.cn(
                      cm.textSize('sm'),
                      it.read ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
                    )}
                  >
                    {it.title}
                  </Box>
                  {it.body && (
                    <Box as="span" className={cm.textSize('xs')}>
                      {it.body}
                    </Box>
                  )}
                  {it.timestamp && (
                    <Box as="span" className={cm.textSize('xs')}>
                      {it.timestamp}
                    </Box>
                  )}
                </Box>
                {!it.read && (
                  <Box
                    as="span"
                    aria-hidden
                    className={cm.cn(cm.bgPrimary, cm.roundedFull)}
                    webStyle={{ width: 8, height: 8, marginTop: 6 }}
                  />
                )}
              </Pressable>
            </Box>
          ))}
        </Box>
      )}
      {onViewAll && hasItems && (
        <Box as="footer" className={cm.cn(cm.sp('p', 2), cm.textCenter)}>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            {t('notifications.viewAll', {}, { defaultValue: 'View all' })}
          </Button>
        </Box>
      )}
    </Box>
  )
}
