/**
 * Vue avatar with a presence overlay.
 *
 * Vue counterpart of `@molecule/app-presence-indicator-react`'s
 * `AvatarWithPresence` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { PresenceDot } from './PresenceDot.js'
import type { PresenceStatus } from './types.js'

/**
 * Wraps any avatar/image and overlays a presence dot at a corner.
 * Non-destructive — just positions the dot; the child is untouched. The
 * child arrives as the default slot or as a `children` prop; the slot wins.
 *
 * @param props - Component props (see {@link AvatarWithPresenceProps}).
 * @returns The avatar-with-presence component.
 */
export const AvatarWithPresence = defineComponent({
  name: 'AvatarWithPresence',
  props: {
    children: null,
    status: { type: String as PropType<PresenceStatus>, default: undefined },
    corner: {
      type: String as PropType<'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'>,
      default: 'bottom-right',
    },
    dotSize: { type: Number, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const children: VNodeChild[] = slots.default
        ? slots.default()
        : props.children != null
          ? [props.children]
          : []
      return h(
        'span',
        {
          class: cm.cn(cm.position('relative'), props.className),
          style: { display: 'inline-block' },
        },
        [
          ...children,
          ...(props.status
            ? [
                h(PresenceDot, {
                  status: props.status,
                  position: 'overlay',
                  corner: props.corner,
                  size: props.dotSize,
                }),
              ]
            : []),
        ],
      )
    }
  },
})
