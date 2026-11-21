/**
 * Vue conversation / thread row: initials avatar with presence dot, name +
 * preview + timestamp + unread pip, and the active-selection treatment.
 *
 * Vue counterpart of `@molecule/app-message-preview-react`'s `MessagePreview` —
 * the same props (React names), the same DOM for the same input, and the same
 * callback calls.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Link } from '@molecule/app-vue'

import type { MessagePreviewPresence } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: a
 * given prop wins (a later `null` removes the node, as React does), and the
 * slot is used only while the prop is absent.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns The children to render.
 */
const nodeValue = (prop: VNodeChild, slot: (() => VNodeChild[]) | undefined): VNodeChild[] => {
  if (prop !== undefined) return prop === null ? [] : [prop]
  if (slot) return slot()
  return []
}

/**
 * Derives up to two uppercase initials from a string ReactNode (React's
 * `deriveInitials`).
 *
 * @param value - The name node.
 * @returns The initials, or the empty string when the name is not a string.
 */
function deriveInitials(value: VNodeChild): string {
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
 * @returns The message preview component.
 */
export const MessagePreview = defineComponent({
  name: 'MessagePreview',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null`).
    name: { type: null, default: undefined },
    preview: { type: null, default: undefined },
    timestamp: { type: null, default: undefined },
    unread: { type: Number, default: 0 },
    presence: { type: String as PropType<MessagePreviewPresence | null>, default: undefined },
    active: { type: Boolean, default: false },
    channelIcon: { type: String, default: undefined },
    initials: { type: String, default: undefined },
    to: { type: String, default: undefined },
    onClick: { type: Function as PropType<() => void>, default: undefined },
    unreadAriaLabel: { type: String, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    // When the row is interactive, Enter / Space activate it (React's
    // `handleKeyDown`): preventDefault, then the click handler with no event.
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!props.onClick) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        props.onClick()
      }
    }

    return (): VNode => {
      const unread = props.unread ?? 0
      const initialsLabel = props.initials ?? deriveInitials(props.name)
      const presenceFill =
        props.presence === 'online'
          ? cm.messagePreviewPresenceOnline
          : props.presence === 'away'
            ? cm.messagePreviewPresenceAway
            : cm.messagePreviewPresenceOffline

      const body: VNodeChild[] = [
        h('div', { class: cm.messagePreviewAvatarWrap }, [
          h(
            'div',
            {
              class: cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(9),
                cm.h(9),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.messagePreviewAvatar,
              ),
            },
            initialsLabel,
          ),
          props.presence
            ? h('span', {
                'aria-hidden': 'true',
                class: cm.cn(
                  cm.messagePreviewPresenceDot,
                  cm.w(2),
                  cm.h(2),
                  cm.roundedFull,
                  presenceFill,
                ),
              })
            : null,
        ]),
        h('div', { class: cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1, cm.minW(0)) }, [
          h('div', { class: cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 2 })) }, [
            h(
              'span',
              {
                class: cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight(unread > 0 ? 'bold' : 'semibold'),
                  cm.messagePreviewName,
                ),
              },
              nodeValue(props.name, slots.name),
            ),
            h(
              'span',
              { class: cm.cn(cm.textSize('xs'), cm.messagePreviewTimestamp) },
              nodeValue(props.timestamp, slots.timestamp),
            ),
          ]),
          h('div', { class: cm.cn(cm.flex({ align: 'center', gap: 2 })) }, [
            props.channelIcon
              ? h(
                  'span',
                  {
                    class: cm.cn(cm.iconGlyphFont, cm.messagePreviewChannelIcon),
                    style: { fontSize: '14px' },
                    'aria-hidden': 'true',
                  },
                  props.channelIcon,
                )
              : null,
            h(
              'p',
              { class: cm.cn(cm.textSize('xs'), cm.messagePreviewText) },
              nodeValue(props.preview, slots.preview),
            ),
            unread > 0
              ? h(
                  'span',
                  {
                    'aria-label':
                      props.unreadAriaLabel !== undefined
                        ? props.unreadAriaLabel
                        : `${unread} unread`,
                    class: cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      cm.messagePreviewUnreadPip,
                    ),
                  },
                  unread,
                )
              : null,
          ]),
        ]),
      ]

      const wrapperClass = cm.cn(
        cm.flex({ gap: 3, align: 'center' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.messagePreviewRow,
        props.active ? cm.messagePreviewRowActive : cm.messagePreviewRowHover,
        props.className,
      )

      if (props.to) {
        return h(
          Link,
          { to: props.to, onClick: props.onClick, class: wrapperClass },
          { default: () => body },
        )
      }
      return h(
        'div',
        {
          role: props.onClick ? 'button' : undefined,
          tabindex: props.onClick ? 0 : undefined,
          onClick: props.onClick,
          onKeydown: handleKeyDown,
          class: wrapperClass,
        },
        body,
      )
    }
  },
})
