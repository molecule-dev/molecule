/**
 * Conversation / thread preview row with avatar + presence dot, name +
 * preview + timestamp + unread pip, and an active-selection treatment.
 *
 * Renders as a `<Link>` when `to` is provided, otherwise as a `<div>`.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { getClassMap } from '@molecule/app-ui'

/** Presence state of the contact shown in the avatar dot. */
export type MessagePreviewPresence = 'online' | 'away' | 'offline'

interface MessagePreviewProps {
  name: ReactNode
  preview: ReactNode
  timestamp: ReactNode
  /** Unread count — 0 hides the pip. */
  unread?: number
  presence?: MessagePreviewPresence | null
  active?: boolean
  /** Material-symbols icon name (e.g. mail / chat / phone) shown ahead of the preview. */
  channelIcon?: string
  /** Override the initials computed from `name`. */
  initials?: string
  /** Optional href; when set, the row renders as a router link. */
  to?: string
  onClick?: () => void
  unreadAriaLabel?: string
  className?: string
}

const PRESENCE_COLOR: Record<MessagePreviewPresence, string> = {
  online: 'bg-[#10b981]',
  away: 'bg-[#f59e0b]',
  offline: 'bg-[#9ca3af]',
}

/** Derives up to two uppercase initials from a string ReactNode. */
function deriveInitials(value: ReactNode): string {
  if (typeof value !== 'string') return ''
  return value
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Conversation / thread preview row. */
export function MessagePreview({
  name,
  preview,
  timestamp,
  unread = 0,
  presence,
  active = false,
  channelIcon,
  initials,
  to,
  onClick,
  unreadAriaLabel,
  className,
}: MessagePreviewProps): JSX.Element {
  const cm = getClassMap()
  const initialsLabel = initials ?? deriveInitials(name)

  const body = (
    <>
      <div className="relative shrink-0">
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(9),
            cm.h(9),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'bg-primary/15 text-primary',
          )}
        >
          {initialsLabel}
        </div>
        {presence ? (
          <span
            aria-hidden="true"
            className={cm.cn(
              'absolute -bottom-0.5 -right-0.5 ring-2 ring-[color:var(--color-surface)]',
              cm.w(2),
              cm.h(2),
              cm.roundedFull,
              PRESENCE_COLOR[presence],
            )}
          />
        ) : null}
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 2 }))}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight(unread > 0 ? 'bold' : 'semibold'),
              'text-on-surface truncate',
            )}
          >
            {name}
          </span>
          <span
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant shrink-0 tabular-nums')}
          >
            {timestamp}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          {channelIcon ? (
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              style={{ fontSize: 14 }}
              aria-hidden="true"
            >
              {channelIcon}
            </span>
          ) : null}
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate flex-1')}>
            {preview}
          </p>
          {unread > 0 ? (
            <span
              aria-label={unreadAriaLabel ?? `${unread} unread`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'min-w-[18px] h-[18px] px-1.5 text-[10px] bg-primary text-white shrink-0',
              )}
            >
              {unread}
            </span>
          ) : null}
        </div>
      </div>
    </>
  )

  const wrapperClass = cm.cn(
    cm.flex({ gap: 3, align: 'center' }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'transition-colors relative border-b border-[color:var(--color-border-secondary)]',
    active ? 'bg-primary/[0.08] border-l-[3px] border-l-primary' : 'hover:bg-surface-secondary',
    className,
  )

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={wrapperClass}>
        {body}
      </Link>
    )
  }
  return (
    <div role={onClick ? 'button' : undefined} onClick={onClick} className={wrapperClass}>
      {body}
    </div>
  )
}

export default MessagePreview
