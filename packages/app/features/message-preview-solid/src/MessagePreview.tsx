/**
 * Solid conversation / thread row: initials avatar with presence dot, name +
 * preview + timestamp + unread pip, and the active-selection treatment.
 *
 * Solid counterpart of `@molecule/app-message-preview-react`'s
 * `MessagePreview` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import { type Component, type JSX, Show } from 'solid-js'

import { Link } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { MessagePreviewProps } from './types.js'

/**
 * Derives up to two uppercase initials from a string ReactNode (React's
 * `deriveInitials`).
 *
 * @param value - The name node.
 * @returns The initials, or the empty string when the name is not a string.
 */
function deriveInitials(value: JSX.Element): string {
  if (typeof value !== 'string') return ''
  return value
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Conversation / thread preview row. Renders as a router `Link` when `to` is
 * provided, otherwise as a `<div>` (a focusable button in the a11y tree,
 * `role="button"` + `tabindex="0"`, when `onClick` is given — Enter / Space
 * activate it).
 *
 * @param props - Component props (see {@link MessagePreviewProps}).
 * @returns The rendered message preview.
 */
export const MessagePreview: Component<MessagePreviewProps> = (props) => {
  const cm = getClassMap()

  // When the row is interactive, Enter / Space activate it (React's
  // `handleKeyDown`): preventDefault, then the click handler with no event.
  const handleKeyDown = (event: KeyboardEvent): void => {
    const onClick = props.onClick
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  const unread = (): number => props.unread ?? 0
  const initialsLabel = (): string => props.initials ?? deriveInitials(props.name)
  const presenceFill = (): string =>
    props.presence === 'online'
      ? cm.messagePreviewPresenceOnline
      : props.presence === 'away'
        ? cm.messagePreviewPresenceAway
        : cm.messagePreviewPresenceOffline
  const wrapperClass = (): string =>
    cm.cn(
      cm.flex({ gap: 3, align: 'center' }),
      cm.sp('px', 4),
      cm.sp('py', 3),
      cm.messagePreviewRow,
      props.active ? cm.messagePreviewRowActive : cm.messagePreviewRowHover,
      props.className,
    )

  /** The row's inner markup — the same body under either root tag. */
  const body = (): JSX.Element => (
    <>
      <div class={cm.messagePreviewAvatarWrap}>
        <div
          class={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(9),
            cm.h(9),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.messagePreviewAvatar,
          )}
        >
          {initialsLabel()}
        </div>
        <Show when={props.presence}>
          <span
            aria-hidden="true"
            class={cm.cn(
              cm.messagePreviewPresenceDot,
              cm.w(2),
              cm.h(2),
              cm.roundedFull,
              presenceFill(),
            )}
          />
        </Show>
      </div>
      <div class={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1, cm.minW(0))}>
        <div class={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 2 }))}>
          <span
            class={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight(unread() > 0 ? 'bold' : 'semibold'),
              cm.messagePreviewName,
            )}
          >
            {props.name}
          </span>
          <span class={cm.cn(cm.textSize('xs'), cm.messagePreviewTimestamp)}>
            {props.timestamp}
          </span>
        </div>
        <div class={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <Show when={props.channelIcon}>
            {(channelIcon) => (
              <span
                class={cm.cn(cm.iconGlyphFont, cm.messagePreviewChannelIcon)}
                style={{ 'font-size': '14px' }}
                aria-hidden="true"
              >
                {channelIcon()}
              </span>
            )}
          </Show>
          <p class={cm.cn(cm.textSize('xs'), cm.messagePreviewText)}>{props.preview}</p>
          <Show when={unread() > 0}>
            <span
              aria-label={props.unreadAriaLabel ?? `${unread()} unread`}
              class={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.roundedFull,
                cm.messagePreviewUnreadPip,
              )}
            >
              {unread()}
            </span>
          </Show>
        </div>
      </div>
    </>
  )

  return (
    <Show
      when={props.to}
      fallback={
        <div
          role={props.onClick ? 'button' : undefined}
          tabindex={props.onClick ? 0 : undefined}
          onClick={props.onClick}
          onKeyDown={handleKeyDown}
          class={wrapperClass()}
        >
          {body()}
        </div>
      }
    >
      {(to) => (
        <Link to={to()} onClick={props.onClick} class={wrapperClass()}>
          {body()}
        </Link>
      )}
    </Show>
  )
}
