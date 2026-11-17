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
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Whether an optional node-valued prop renders at all: React's
 * `{subtitle && <span>}` truthiness on the prop, plus a same-named slot being
 * present.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the subtitle span renders.
 */
const hasNode = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => slot != null || (prop != null && prop !== '' && prop !== false)

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
          hasNode(subtitleSlot, props.subtitle)
            ? h('span', { class: cm.textSize('xs') }, [...slotOrProp(subtitleSlot, props.subtitle)])
            : null,
        ]),
        ...slotOrProp(trailingSlot, props.trailing),
      ])
    }
  },
})
