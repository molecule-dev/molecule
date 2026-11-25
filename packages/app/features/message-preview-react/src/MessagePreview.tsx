import type { JSX, KeyboardEvent, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box, GlyphIcon, Link, Pressable, Text } from '@molecule/app-ui-react/elements'

/** Presence state of the contact shown in the avatar dot. */
export type MessagePreviewPresence = 'online' | 'away' | 'offline'

/** Props for {@link MessagePreview}. */
export interface MessagePreviewProps {
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

/**
 * Conversation / thread preview row. Renders as a `<Link>` when `to` is
 * provided (requires the app's router — `RouterProvider`), otherwise as a
 * `<div>` — a focusable button in the a11y tree (`role="button"`,
 * `tabIndex={0}`) when `onClick` is given, with Enter / Space activating it,
 * matching native button keyboard semantics.
 * @param props - Component props (see {@link MessagePreviewProps}).
 */
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
  const presenceFill =
    presence === 'online'
      ? cm.messagePreviewPresenceOnline
      : presence === 'away'
        ? cm.messagePreviewPresenceAway
        : cm.messagePreviewPresenceOffline

  const body = (
    <>
      <Box as="div" className={cm.messagePreviewAvatarWrap}>
        <Box
          as="div"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(9),
            cm.h(9),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.messagePreviewAvatar,
          )}
        >
          {initialsLabel}
        </Box>
        {presence ? (
          <Box
            as="span"
            aria-hidden="true"
            className={cm.cn(
              cm.messagePreviewPresenceDot,
              cm.w(2),
              cm.h(2),
              cm.roundedFull,
              presenceFill,
            )}
          />
        ) : null}
      </Box>
      <Box as="div" className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1, cm.minW(0))}>
        <Box as="div" className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 2 }))}>
          <Text
            as="span"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight(unread > 0 ? 'bold' : 'semibold'),
              cm.messagePreviewName,
            )}
          >
            {name}
          </Text>
          <Text as="span" className={cm.cn(cm.textSize('xs'), cm.messagePreviewTimestamp)}>
            {timestamp}
          </Text>
        </Box>
        <Box as="div" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          {channelIcon ? (
            <GlyphIcon
              name={channelIcon}
              className={cm.messagePreviewChannelIcon}
              style={{ fontSize: 14 }}
              aria-hidden="true"
            />
          ) : null}
          <Text as="p" className={cm.cn(cm.textSize('xs'), cm.messagePreviewText)}>
            {preview}
          </Text>
          {unread > 0 ? (
            <Text
              as="span"
              aria-label={unreadAriaLabel ?? `${unread} unread`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.roundedFull,
                cm.messagePreviewUnreadPip,
              )}
            >
              {unread}
            </Text>
          ) : null}
        </Box>
      </Box>
    </>
  )

  const wrapperClass = cm.cn(
    cm.flex({ gap: 3, align: 'center' }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.messagePreviewRow,
    active ? cm.messagePreviewRowActive : cm.messagePreviewRowHover,
    className,
  )

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={wrapperClass}>
        {body}
      </Link>
    )
  }
  // When the row is interactive, promote the <div> to a real button in the
  // a11y tree: role/tabIndex make it focusable and Enter/Space activate it,
  // matching native button keyboard semantics.
  const handleKeyDown = onClick
    ? (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }
    : undefined
  return (
    <Pressable
      as="div"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={wrapperClass}
    >
      {body}
    </Pressable>
  )
}

export default MessagePreview
