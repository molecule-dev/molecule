/**
 * Vue avatar + name + optional subtitle row.
 *
 * Vue counterpart of `@molecule/app-avatar-stack-react`'s `UserChip` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-vue'
import { toChildArray } from '@molecule/app-vue'

import type { UserChipProps } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  const nodes: VNodeChild[] = slot ? slot() : prop != null ? [prop] : []
  return toChildArray(nodes).length > 0 ? nodes : []
}

/**
 * Avatar + name + optional subtitle row — useful in dropdowns, mention
 * pickers, assignment popovers, and row-level user references.
 *
 * @param props - Component props (see {@link UserChipProps}).
 * @returns The user chip component.
 */
export const UserChip = defineComponent({
  name: 'UserChip',
  props: {
    name: { type: String, required: true },
    href: String,
    nameLinkProps: Object as PropType<UserChipProps['nameLinkProps']>,
    src: String,
    subtitle: null,
    trailing: null,
    size: {
      type: String as PropType<'xs' | 'sm' | 'md' | 'lg'>,
      default: 'sm',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const subtitleSlot = slots.subtitle
      const trailingSlot = slots.trailing
      const subtitleNodes = slotOrProp(subtitleSlot, props.subtitle)
      const avatar = h(Avatar, {
        src: props.src,
        alt: props.name,
        name: props.name,
        size: props.size,
      })
      const { className, class: linkClass, ...linkAttrs } = props.nameLinkProps ?? {}
      return h('div', { class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className) }, [
        props.href === undefined ? avatar : h('div', { 'aria-hidden': 'true' }, [avatar]),
        h('div', { class: cm.cn(cm.flex1, cm.stack(0)) }, [
          props.href === undefined
            ? h('span', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium')) }, [props.name])
            : h(
                'a',
                {
                  'data-mol-id': 'user-chip-profile',
                  ...linkAttrs,
                  href: props.href,
                  class: [cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), className), linkClass],
                },
                [props.name],
              ),
          subtitleNodes.length > 0 ? h('span', { class: cm.textSize('xs') }, subtitleNodes) : null,
        ]),
        ...slotOrProp(trailingSlot, props.trailing),
      ])
    }
  },
})
