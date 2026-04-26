import { Link } from 'react-router-dom'

import { getClassMap } from '@molecule/app-ui'

import { fmtRelativeShort } from './fmtRelativeShort.js'

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
}: NotificationFeedProps) {
  const cm = getClassMap()
  return (
    <ul
      className={cm.cn('space-y-2', className)}
      aria-label={ariaLabel}
      data-mol-id={dataMolId}
    >
      {items.map(item => {
        const content = (
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({ align: 'start', gap: 'md' }),
              'bg-surface rounded-lg shadow-sm',
              item.unread ? 'border-l-4 border-primary' : '',
            )}
          >
            <div className={cm.cn('h-10 w-10 flex items-center justify-center bg-primary-container rounded-full text-primary flex-shrink-0')}>
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{item.title}</h2>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant whitespace-nowrap')}>
                  {fmtRelativeShort(item.createdAt)}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{item.body}</p>
            </div>
          </div>
        )
        return (
          <li key={item.id}>
            {item.href ? <Link to={item.href} className="block">{content}</Link> : content}
          </li>
        )
      })}
    </ul>
  )
}
