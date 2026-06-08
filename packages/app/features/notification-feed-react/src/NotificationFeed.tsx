import type { JSX } from 'react'
import { Link } from 'react-router-dom'

import { getClassMap } from '@molecule/app-ui'

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
 * @param root0
 * @param root0.items
 * @param root0.ariaLabel
 * @param root0.className
 * @param root0.dataMolId
 */
export function NotificationFeed({
  items,
  ariaLabel,
  className,
  dataMolId,
}: NotificationFeedProps): JSX.Element {
  const cm = getClassMap()
  return (
    <ul className={cm.cn('space-y-2', className)} aria-label={ariaLabel} data-mol-id={dataMolId}>
      {items.map((item) => {
        const content = (
          <div
            className={cm.cn(
              cm.card(),
              cm.sp('p', 4),
              cm.flex({ align: 'start', gap: 'md' }),
              item.unread ? 'border-l-4 border-primary' : '',
            )}
          >
            <div
              className={cm.cn(
                cm.shrink0,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                cm.textPrimary,
                'h-10 w-10 bg-primary-container',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
            </div>
            <div className={cm.cn(cm.flex1, 'min-w-0')}>
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {item.title}
                </h2>
                <span className={cm.cn(cm.textSize('xs'), cm.textMuted, 'whitespace-nowrap')}>
                  {fmtRelativeShort(item.createdAt)}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{item.body}</p>
            </div>
          </div>
        )
        return (
          <li key={item.id}>
            {item.href ? (
              <Link to={item.href} className="block">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ul>
  )
}
