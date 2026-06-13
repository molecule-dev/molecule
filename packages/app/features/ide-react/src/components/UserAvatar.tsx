/**
 * Renders the signed-in user's profile avatar beside their own chat messages
 * (SOC1). When the host supplies a safe, renderable avatar
 * ({@link ChatPanelProps.userAvatar}, gated by {@link resolveUserAvatar}) it shows
 * the real image; otherwise it falls back to the generic `user` glyph from the
 * bonded icon set — so the column is always present and the layout never shifts.
 *
 * @module
 */

import type { JSX } from 'react'

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
}

/**
 * Renders the user's avatar image, or the generic `user` icon when there is no
 * safe, renderable avatar.
 *
 * @param props - {@link UserAvatarProps}.
 * @returns The avatar image or icon fallback.
 */
export function UserAvatar({ userAvatar, size = 24 }: UserAvatarProps): JSX.Element {
  const cm = getClassMap()
  const src = resolveUserAvatar(userAvatar)
  // The user's own avatar identifies their messages — "You" is the accurate,
  // already-translated label (reused from the chat author label) for both the
  // image alt and the icon fallback's accessible name.
  const label = t('ide.chat.you', undefined, { defaultValue: 'You' })

  if (src) {
    return (
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
    )
  }

  return (
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
}

UserAvatar.displayName = 'UserAvatar'
