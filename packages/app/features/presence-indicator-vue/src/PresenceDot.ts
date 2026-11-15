/**
 * Vue presence dot: a small colored status circle.
 *
 * Vue counterpart of `@molecule/app-presence-indicator-react`'s `PresenceDot` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { PresenceStatus } from './types.js'

/** The fixed semantic hue of each presence state. */
const STATUS_COLOR: Record<PresenceStatus, string> = {
  online: '#22c55e',
  away: '#eab308',
  busy: '#ef4444',
  offline: '#94a3b8',
}

/**
 * Small colored circle indicating user presence. Use inline next to a name,
 * or with `position="overlay"` attached to the corner of an avatar.
 *
 * The default aria-label is the English string `Presence: <status>` — pass
 * `ariaLabel` (e.g. from `t()`) in localized apps.
 *
 * @param props - Component props (see {@link PresenceDotProps}).
 * @returns The presence dot component.
 */
export const PresenceDot = defineComponent({
  name: 'PresenceDot',
  props: {
    status: { type: String as PropType<PresenceStatus>, required: true },
    size: { type: Number, default: 10 },
    position: { type: String as PropType<'inline' | 'overlay'>, default: 'inline' },
    corner: {
      type: String as PropType<'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'>,
      default: 'bottom-right',
    },
    ariaLabel: { type: String, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode => {
      const style: Record<string, string> = {
        display: 'inline-block',
        width: `${props.size}px`,
        height: `${props.size}px`,
        borderRadius: '50%',
        background: STATUS_COLOR[props.status],
      }
      if (props.position === 'overlay') {
        style.boxShadow = '0 0 0 2px var(--color-surface, #fff)'
        style.position = 'absolute'
        if (props.corner.includes('top')) style.top = '0px'
        if (props.corner.includes('bottom')) style.bottom = '0px'
        if (props.corner.includes('right')) style.right = '0px'
        if (props.corner.includes('left')) style.left = '0px'
      }
      return h('span', {
        role: 'status',
        'aria-label': props.ariaLabel ?? `Presence: ${props.status}`,
        class: cm.cn(props.className),
        style,
      })
    }
  },
})
