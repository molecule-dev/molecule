import type { JSX } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box, GlyphIcon, Link, Text } from '@molecule/app-ui-react/elements'

import { fmtRelativeShort } from './fmtRelativeShort.js'

/**
 * A single item rendered inside a NotificationFeed list.
 */
export interface FeedItem {
  /** Stable identifier (used as React key). */
  id: string
  /** Material symbol icon name (e.g. `'check_circle'`, `'chat'`). */
  icon: string
  /** Bolded headline string. */
  title: string
  /** Secondary body string. */
  body: string
  /** ISO timestamp shown as relative time on the right. */
  createdAt: string
  /** Optional route — when set, wraps the row in `<Link>`. */
  href?: string | null
  /** When true, the row gets a left primary-accent border. */
  unread?: boolean
}

/**
 * Props for the NotificationFeed component.
 */
export interface NotificationFeedProps {
  /** Items to render, top to bottom. */
  items: ReadonlyArray<FeedItem>
  /** Aria-label for the underlying `<ul>`. */
  ariaLabel?: string
  /** Extra classes on the outer `<ul>`. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Vertical notification feed: typed icon + title + body + relative time
 * with optional unread border-l accent and optional per-row Link.
 *
 * Apps build their own typed-icon mapping (notif.type → icon name) and
 * pass the resolved icon string in. Keeps this package free of per-app
 * type unions.
 *
 * @param props - Component props (see {@link NotificationFeedProps}).
 */
export function NotificationFeed({
  items,
  ariaLabel,
  className,
  dataMolId,
}: NotificationFeedProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Box
      as="ul"
      className={cm.cn(cm.notificationFeedList, className)}
      aria-label={ariaLabel}
      data-mol-id={dataMolId}
    >
      {items.map((item) => {
        const content = (
          <Box
            as="div"
            className={cm.cn(
              cm.card(),
              cm.sp('p', 4),
              cm.flex({ align: 'start', gap: 'md' }),
              item.unread ? cm.notificationFeedUnreadAccent : '',
            )}
          >
            <Box
              as="div"
              className={cm.cn(
                cm.shrink0,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                cm.textPrimary,
                cm.notificationFeedIconTile,
              )}
            >
              <GlyphIcon name={item.icon} aria-hidden />
            </Box>
            <Box as="div" className={cm.cn(cm.flex1, cm.minW(0))}>
              <Box as="div" className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                <Text as="h2" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {item.title}
                </Text>
                <Text
                  as="span"
                  className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.notificationFeedTimestamp)}
                >
                  {fmtRelativeShort(item.createdAt)}
                </Text>
              </Box>
              <Text as="p" className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {item.body}
              </Text>
            </Box>
          </Box>
        )
        return (
          <Box as="li" key={item.id}>
            {item.href ? (
              <Link to={item.href} className={cm.displayBlock}>
                {content}
              </Link>
            ) : (
              content
            )}
          </Box>
        )
      })}
    </Box>
  )
}
