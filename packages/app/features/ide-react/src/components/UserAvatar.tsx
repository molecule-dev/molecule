/**
 * Renders the signed-in user's profile avatar beside their own chat messages
 * (SOC1). When the host supplies a safe, renderable avatar
 * ({@link ChatPanelProps.userAvatar}, gated by {@link resolveUserAvatar}) it shows
 * the real image; otherwise it falls back to the generic `user` glyph from the
 * bonded icon set — so the column is always present and the layout never shifts.
 *
 * @module
 */

import { type JSX, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from './Icon.js'
import { resolveUserAvatar } from './user-avatar-utilities.js'

/**
 * Props for {@link UserAvatar}.
 */
export interface UserAvatarProps {
  /**
   * The signed-in user's avatar — an inline `data:image/*` URI or an `http(s)`
   * URL from their profile metadata. Unsafe / unset / oversized values are
   * ignored (see {@link resolveUserAvatar}) and the generic icon is shown.
   */
  userAvatar?: string | null
  /** Diameter of the avatar in pixels. Defaults to 24. */
  size?: number
  /**
   * Optional click handler. When supplied, the avatar becomes an interactive
   * button (pointer cursor, hover/focus ring, keyboard- and screen-reader
   * accessible) that opens the user's profile — the host decides what to show.
   * When omitted (the default) the avatar renders exactly as before: a static,
   * non-interactive image/icon, so existing call sites are unaffected.
   */
  onClick?: () => void
}

/**
 * Renders the user's avatar image, or the generic `user` icon when there is no
 * safe, renderable avatar. When {@link UserAvatarProps.onClick} is provided the
 * visual is wrapped in an accessible button so the avatar can open the user's
 * profile.
 *
 * @param props - {@link UserAvatarProps}.
 * @returns The avatar image or icon fallback, optionally wrapped in a button.
 */
export function UserAvatar({ userAvatar, size = 24, onClick }: UserAvatarProps): JSX.Element {
  const cm = getClassMap()
  const [hover, setHover] = useState(false)
  const src = resolveUserAvatar(userAvatar)
  // The user's own avatar identifies their messages — "You" is the accurate,
  // already-translated label (reused from the chat author label) for both the
  // image alt and the icon fallback's accessible name.
  const label = t('ide.chat.you', undefined, { defaultValue: 'You' })

  const visual = src ? (
    <img
      src={src}
      alt={label}
      data-mol-id="chat-user-avatar"
      // Circle sizing / cropping the ClassMap cannot express.
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
      }}
    />
  ) : (
    <span
      // surfaceSecondary supplies the circle background; textMuted sets the glyph
      // color (the icon paints with currentColor) — both via ClassMap, so neither
      // is set inline (which would override the themed classes).
      className={cm.cn(cm.surfaceSecondary, cm.textMuted)}
      data-mol-id="chat-user-avatar"
      role="img"
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon name="user" size={Math.round(size * 0.6)} aria-hidden="true" />
    </span>
  )

  // Non-interactive (the default) — render the bare visual, unchanged.
  if (!onClick) return visual

  // Interactive — wrap in a real button so it's keyboard-focusable and
  // screen-reader-labelled. The ring is a hover/focus affordance (a property the
  // ClassMap doesn't manage for this one-off circular control), tinted with the
  // primary theme token (no hardcoded hex). Native focus styling is preserved.
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-mol-id="chat-user-avatar-button"
      aria-label={t('ide.chat.viewProfile', undefined, { defaultValue: 'View profile' })}
      style={{
        padding: 0,
        margin: 0,
        border: 'none',
        background: 'transparent',
        borderRadius: '50%',
        display: 'inline-flex',
        flexShrink: 0,
        cursor: 'pointer',
        lineHeight: 0,
        boxShadow: hover
          ? '0 0 0 2px color-mix(in srgb, var(--mol-color-primary, #6366f1) 60%, transparent)'
          : 'none',
        transition: 'box-shadow 100ms',
      }}
    >
      {visual}
    </button>
  )
}

UserAvatar.displayName = 'UserAvatar'
