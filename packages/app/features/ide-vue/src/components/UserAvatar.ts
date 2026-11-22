/**
 * Renders the signed-in user's profile avatar beside their own chat messages
 * (SOC1). When the host supplies a safe, renderable avatar it shows the real
 * image; otherwise it falls back to the generic `user` glyph from the bonded
 * icon set — so the column is always present and the layout never shifts.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `UserAvatar` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. The root element changes with the branch —
 * a bare `<img>`/`<span>` without `onClick`, the accessible `<button>` wrapper
 * with it — which Vue's render function switches without a wrapper element.
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are the
 * rounded-square crop and the one-off primary tint the ClassMap can't express,
 * written with `px` the way the DOM takes them here (React adds `px` to a
 * number). All user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode } from 'vue'

import { resolveUserAvatar } from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { Icon } from './Icon.js'

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

/**
 * The tinted backdrop behind every avatar tile: a solid, VISIBLE primary mix
 * so a transparent PNG (or the pre-load gap) shows a real tile — a one-off
 * color-mix the ClassMap can't express, so it's inline. `size` in px, the way
 * the DOM takes it here.
 *
 * @param size - The avatar's diameter in pixels.
 * @returns The inline style shared by the `<img>` and the fallback tile.
 */
function tileStyle(size: number): Record<string, string | number> {
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '6px',
    background:
      'color-mix(in srgb, var(--mol-color-primary, #6366f1) 18%, var(--mol-color-surface, #f4f4f4))',
  }
}

/**
 * Renders the user's avatar image, or the generic `user` icon when there is no
 * safe, renderable avatar. When {@link UserAvatarProps.onClick} is provided the
 * visual is wrapped in an accessible button so the avatar can open the user's
 * profile.
 *
 * @param props - See {@link UserAvatarProps}.
 * @returns The avatar image or icon fallback, optionally wrapped in a button.
 */
export const UserAvatar = defineComponent({
  name: 'UserAvatar',
  inheritAttrs: false,
  props: {
    /** The signed-in user's avatar (see {@link UserAvatarProps.userAvatar}). */
    userAvatar: {
      type: [String, null] as PropType<string | null>,
      required: false,
      default: undefined,
    },
    /** The message author's display name (see {@link UserAvatarProps.name}). */
    name: { type: String, required: false, default: undefined },
    /** Diameter of the avatar in pixels. Defaults to 24. */
    size: { type: Number, required: false, default: 24 },
    /** Optional click handler (see {@link UserAvatarProps.onClick}). */
    onClick: {
      type: Function as PropType<() => void>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // The hover/focus ring state (React's `useState(false)` + the four
    // handlers; focus and hover share one highlight exactly as React's do).
    const hover = ref(false)

    return (): VNode => {
      const src = resolveUserAvatar(props.userAvatar)
      // A whitespace-only (or empty) name is no name: it initials to nothing,
      // and the label below drops to '' so the fallback tile renders
      // decorative (aria-hidden, no image role) instead of announcing a blank.
      const trimmedName = props.name?.trim() ?? ''
      // The avatar identifies the message's sender: the author's raw name when
      // we have one (a teammate's message — untrimmed, only its initial is),
      // else the solo "You" (already-translated) for the viewer's own messages
      // — used for both the image alt and the fallback tile's accessible name.
      const label = trimmedName
        ? props.name!
        : props.name == null
          ? t('ide.chat.you', undefined, { defaultValue: 'You' })
          : ''
      // Named author with no renderable avatar → an initial-letter tile ("T"
      // for Test), never the generic glyph and NEVER someone else's picture.
      const initial = trimmedName.charAt(0).toUpperCase()

      const visual: VNode =
        src !== null
          ? h('img', {
              src,
              alt: label,
              'data-mol-id': 'chat-user-avatar',
              style: { ...tileStyle(props.size), objectFit: 'cover', flexShrink: '0' },
            })
          : h(
              'span',
              {
                'data-mol-id': 'chat-user-avatar',
                // A glyph with no name to announce (a whitespace-only author
                // name) is decorative chrome: no image role, no label — axe
                // `role-img-alt`.
                'aria-hidden': label ? undefined : 'true',
                role: label ? 'img' : undefined,
                'aria-label': label || undefined,
                style: {
                  ...tileStyle(props.size),
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: '0',
                  color: 'var(--mol-color-primary, #6366f1)',
                },
              },
              initial
                ? [
                    h(
                      'span',
                      {
                        'aria-hidden': 'true',
                        style: {
                          fontSize: `${Math.round(props.size * 0.45)}px`,
                          fontWeight: '600',
                          lineHeight: '1',
                        },
                      },
                      [initial],
                    ),
                  ]
                : [
                    h(Icon, {
                      name: 'user',
                      size: Math.round(props.size * 0.6),
                      'aria-hidden': 'true',
                    }),
                  ],
            )

      // Non-interactive (the default) — render the bare visual, unchanged.
      if (!props.onClick) return visual

      // Interactive — a real button so it's keyboard-focusable and
      // screen-reader-labelled. The 1px border is always present (transparent
      // at rest) so hovering never shifts layout; the ClassMap's
      // `touchTargetCompact` carries the hit floor.
      return h(
        'button',
        {
          type: 'button',
          'data-mol-id': 'chat-user-avatar-button',
          'aria-label': t('ide.chat.viewProfile', undefined, { defaultValue: 'View profile' }),
          class: cm.touchTargetCompact,
          style: {
            padding: '0px',
            margin: '0px',
            background: 'transparent',
            borderRadius: '6px',
            display: 'inline-flex',
            flexShrink: '0',
            cursor: 'pointer',
            lineHeight: '0',
            boxSizing: 'border-box',
            border: hover.value
              ? '1px solid var(--mol-color-primary, #6366f1)'
              : '1px solid transparent',
            transition: 'box-shadow 100ms',
          },
          // React hands the caller's own function to the element; so does Vue,
          // so the click reaches the host exactly as React's does (event arg
          // and all).
          onClick: props.onClick,
          onMouseenter: (): void => {
            hover.value = true
          },
          onMouseleave: (): void => {
            hover.value = false
          },
          onFocus: (): void => {
            hover.value = true
          },
          onBlur: (): void => {
            hover.value = false
          },
        },
        [visual],
      )
    }
  },
})
