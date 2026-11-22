/**
 * Renders the signed-in user's profile avatar beside their own chat messages
 * (SOC1). When the host supplies a safe, renderable avatar it shows the real
 * image; otherwise it falls back to the generic `user` glyph from the bonded
 * icon set — so the column is always present and the layout never shifts.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `UserAvatar` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. Props stay reactive getters (never
 * destructured), and the branch choices read inside the JSX — Solid renders
 * once, so a `userAvatar` / `name` / `onClick` change re-decides the branches
 * in place the way React re-renders. Styling uses `getClassMap()` (`cm.*`);
 * the only inline styles are the rounded-square crop and the one-off primary
 * tint the ClassMap can't express, with kebab-case keys and `px` the way the
 * DOM takes them here. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'

import { resolveUserAvatar } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from './Icon.jsx'

/**
 * Props for {@link UserAvatar} — the React prop names, React's own contract.
 */
export interface UserAvatarProps {
  /**
   * The signed-in user's avatar — an inline `data:image/*` URI or an `http(s)`
   * URL from their profile metadata. Unsafe / unset / oversized values are
   * ignored (see `resolveUserAvatar`) and the generic icon is shown.
   */
  userAvatar?: string | null
  /**
   * The message author's display name, for a TEAMMATE's message. When set and
   * there is no renderable avatar, the fallback tile shows the name's initial
   * instead of the generic `user` glyph. Also used as the accessible label /
   * image alt in place of the solo "You".
   */
  name?: string
  /** Diameter of the avatar in pixels. Defaults to 24. */
  size?: number
  /**
   * Optional click handler. When supplied, the avatar becomes an interactive
   * button that opens the user's profile; when omitted (the default) it
   * renders as a static, non-interactive image/icon.
   */
  onClick?: () => void
}

/** The tinted backdrop behind every avatar tile (the ClassMap can't express it). */
const TILE_BACKGROUND =
  'color-mix(in srgb, var(--mol-color-primary, #6366f1) 18%, var(--mol-color-surface, #f4f4f4))'

/**
 * Renders the user's avatar image, or the generic `user` icon when there is no
 * safe, renderable avatar. When {@link UserAvatarProps.onClick} is provided the
 * visual is wrapped in an accessible button so the avatar can open the user's
 * profile.
 *
 * @param props - See {@link UserAvatarProps}.
 * @returns The avatar image or icon fallback, optionally wrapped in a button.
 */
export function UserAvatar(props: UserAvatarProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The hover/focus ring state (React's `useState(false)` + the four
  // handlers; focus and hover share one highlight exactly as React's do).
  const [hover, setHover] = createSignal(false)

  // The visual reads every prop through its accessor inside the JSX, so a
  // changed prop re-decides the branches (React's render is a pure function of
  // the props).
  const visual = (): JSX.Element => {
    const size = props.size ?? 24
    const src = resolveUserAvatar(props.userAvatar)
    // A whitespace-only (or empty) name is no name: it initials to nothing, and
    // the label below drops to '' so the fallback tile renders decorative
    // (aria-hidden, no image role) instead of announcing a blank.
    const trimmedName = props.name?.trim() ?? ''
    // The avatar identifies the message's sender: the author's raw name when we
    // have one (a teammate's message — untrimmed, only its initial is), else the
    // solo "You" (already-translated) for the viewer's own messages — used for
    // both the image alt and the fallback tile's accessible name.
    const label = trimmedName
      ? props.name!
      : props.name == null
        ? t('ide.chat.you', undefined, { defaultValue: 'You' })
        : ''
    // Named author with no renderable avatar → an initial-letter tile, never
    // the generic glyph and NEVER someone else's picture.
    const initial = trimmedName.charAt(0).toUpperCase()

    if (src !== null) {
      return (
        <img
          src={src}
          alt={label}
          data-mol-id="chat-user-avatar"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            'border-radius': '6px',
            'object-fit': 'cover',
            'flex-shrink': '0',
            background: TILE_BACKGROUND,
          }}
        />
      )
    }

    return (
      <span
        data-mol-id="chat-user-avatar"
        // A glyph with no name to announce (a whitespace-only author name) is
        // decorative chrome: no image role, no label — axe `role-img-alt`.
        aria-hidden={label ? undefined : true}
        role={label ? 'img' : undefined}
        aria-label={label || undefined}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          'border-radius': '6px',
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'flex-shrink': '0',
          background: TILE_BACKGROUND,
          color: 'var(--mol-color-primary, #6366f1)',
        }}
      >
        {initial !== '' ? (
          <span
            aria-hidden="true"
            style={{
              'font-size': `${Math.round(size * 0.45)}px`,
              'font-weight': '600',
              'line-height': '1',
            }}
          >
            {initial}
          </span>
        ) : (
          <Icon name="user" size={Math.round(size * 0.6)} aria-hidden="true" />
        )}
      </span>
    )
  }

  // The interactive/non-interactive choice reads `props.onClick` inside the
  // JSX's tracked getter (an IIFE, as in `Icon`), so adding or removing the
  // handler after mount swaps the bare visual for the button and back exactly
  // where React re-renders.
  return (
    <>
      {(() => {
        const onClick = props.onClick

        // Non-interactive (the default) — the bare visual, unchanged.
        if (!onClick) return visual()

        // Interactive — a real button so it's keyboard-focusable and
        // screen-reader-labelled. The 1px border is always present
        // (transparent at rest) so hovering never shifts layout; the
        // ClassMap's `touchTargetCompact` carries the hit floor.
        return (
          <button
            /* mol-bespoke-button: an AVATAR button — the control is the picture,
               and its rounded-square crop plus the 1px hover/focus ring (primary
               theme token, always present as transparent so hovering never shifts
               layout) are things cm.button() has no opinion about. Its coarse
               hit floor now comes from the ClassMap; it had none at all. */
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            data-mol-id="chat-user-avatar-button"
            aria-label={t('ide.chat.viewProfile', undefined, { defaultValue: 'View profile' })}
            class={cm.touchTargetCompact}
            style={{
              padding: '0px',
              margin: '0px',
              'border-radius': '6px',
              display: 'inline-flex',
              'flex-shrink': '0',
              cursor: 'pointer',
              'line-height': '0',
              'box-sizing': 'border-box',
              transition: 'box-shadow 100ms',
              // Solid hoists these static keys into the template's parsed
              // `style` attribute, and jsdom's style parser drops
              // `background: transparent` when a longhand declaration follows
              // it — so this key goes LAST. React writes the same declarations
              // at runtime; the conformance normalizer sorts them anyway.
              background: 'transparent',
              border: hover()
                ? '1px solid var(--mol-color-primary, #6366f1)'
                : '1px solid transparent',
            }}
          >
            {visual()}
          </button>
        )
      })()}
    </>
  )
}
