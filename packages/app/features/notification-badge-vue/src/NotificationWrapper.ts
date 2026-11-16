/**
 * Vue notification wrapper: positions a `<NotificationBadge>` at a corner of
 * any child element.
 *
 * Vue counterpart of `@molecule/app-notification-badge-react`'s
 * `NotificationWrapper` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { NotificationBadge } from './NotificationBadge.js'
import type { NotificationWrapperProps } from './types.js'

/**
 * Resolves the decorated child that may arrive as the default slot or as a
 * `children` prop: a prop that was given wins (React's single source of truth
 * — a later `null` removes the node, as React does), and the slot is used only
 * while the prop is absent.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns The children to render.
 */
const childNodes = (prop: VNodeChild, slot: (() => VNodeChild[]) | undefined): VNodeChild[] => {
  if (prop !== undefined) return prop === null ? [] : [prop]
  if (slot) return slot()
  return []
}

/**
 * Positions a `<NotificationBadge>` at a corner of any child element.
 * The wrapper becomes `relative` so the badge absolutely positions
 * correctly — wrap icon buttons, avatars, or nav entries.
 *
 * @param props - Component props (see {@link NotificationWrapperProps}).
 * @returns The wrapper component.
 */
export const NotificationWrapper = defineComponent({
  name: 'NotificationWrapper',
  props: {
    children: null,
    count: { type: Number, required: true },
    hideOnZero: { type: Boolean, default: true },
    variant: {
      type: String as PropType<NonNullable<NotificationWrapperProps['variant']>>,
      default: 'error',
    },
    placement: {
      type: String as PropType<NonNullable<NotificationWrapperProps['placement']>>,
      default: 'top-right',
    },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const style: Record<string, string> = { position: 'absolute' }
      if (props.placement.includes('top')) style.top = '-4px'
      if (props.placement.includes('bottom')) style.bottom = '-4px'
      if (props.placement.includes('right')) style.right = '-4px'
      if (props.placement.includes('left')) style.left = '-4px'
      return h(
        'span',
        {
          class: cm.cn(cm.position('relative'), props.className),
          style: { display: 'inline-block' },
        },
        [
          ...childNodes(props.children, slots.default),
          h('span', { style }, [
            h(NotificationBadge, {
              count: props.count,
              hideOnZero: props.hideOnZero,
              variant: props.variant,
            }),
          ]),
        ],
      )
    }
  },
})
