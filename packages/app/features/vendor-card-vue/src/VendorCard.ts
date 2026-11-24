/**
 * Vue vendor / seller / agent profile card.
 *
 * Vue counterpart of `@molecule/app-vendor-card-react`'s `VendorCard` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Avatar, Card } from '@molecule/app-ui-vue'
import { toChildArray } from '@molecule/app-vue'

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
 * Whether a node-valued prop renders at all: React's `{node && <wrapper>}`
 * truthiness on the prop, plus a same-named slot being present.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the wrapper around the node renders.
 */
const hasNode = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => toChildArray(slotOrProp(slot, prop)).length > 0

/**
 * Vendor / seller / agent profile card. Used in marketplaces, agent
 * directories, multi-tenant catalogs.
 *
 * Composes `Card` + `Avatar` from `@molecule/app-ui-vue`. `onClick` makes the
 * whole card clickable but adds no keyboard handler or role — put primary
 * navigation in `actions` buttons for accessibility. Node-valued props
 * (`name`, `description`, `memberSince`, `badges`, `actions`) arrive as a
 * prop AND a same-named slot; the component accepts either.
 *
 * @param props - Component props (see {@link VendorCardProps}).
 * @returns The vendor card component.
 */
export const VendorCard = defineComponent({
  name: 'VendorCard',
  props: {
    name: null,
    logoSrc: { type: String, default: undefined },
    description: null,
    rating: { type: Number, default: undefined },
    reviewCount: { type: Number, default: undefined },
    memberSince: null,
    badges: null,
    actions: null,
    className: { type: String, default: undefined },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    const cm = getClassMap()

    return (): VNode => {
      const displayName = typeof props.name === 'string' ? props.name : 'Vendor'
      const rating = props.rating
      return h(
        Card,
        {
          className: props.className,
          onClick: (event: MouseEvent) => emit('click', event),
        },
        {
          default: () => [
            h('div', { class: cm.flex({ align: 'start', gap: 'md' }) }, [
              h(Avatar, { src: props.logoSrc, alt: displayName, name: displayName, size: 'lg' }),
              h('div', { class: cm.cn(cm.flex1, cm.stack(2)) }, [
                h('header', [
                  h(
                    'h3',
                    { class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) },
                    slotOrProp(slots.name, props.name),
                  ),
                  // React's `{description && …}`: a falsy description renders nothing.
                  ...(hasNode(slots.description, props.description)
                    ? [
                        h(
                          'p',
                          { class: cm.textSize('sm') },
                          slotOrProp(slots.description, props.description),
                        ),
                      ]
                    : []),
                ]),
                h('div', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, [
                  // React's `rating !== undefined`: a zero rating still renders.
                  ...(rating !== undefined
                    ? [
                        h(
                          'span',
                          {
                            class: cm.cn(
                              cm.flex({ align: 'center', gap: 'xs' }),
                              cm.textSize('sm'),
                            ),
                          },
                          [
                            h('span', { 'aria-hidden': 'true' }, '★'),
                            h('span', { class: cm.fontWeight('semibold') }, rating.toFixed(1)),
                            ...(props.reviewCount !== undefined
                              ? [h('span', `(${props.reviewCount})`)]
                              : []),
                          ],
                        ),
                      ]
                    : []),
                  ...(hasNode(slots.memberSince, props.memberSince)
                    ? [
                        h('span', { class: cm.textSize('xs') }, [
                          '· ',
                          ...slotOrProp(slots.memberSince, props.memberSince),
                        ]),
                      ]
                    : []),
                  ...slotOrProp(slots.badges, props.badges),
                ]),
                // React's `{actions && …}`: a falsy actions row renders nothing.
                ...(hasNode(slots.actions, props.actions)
                  ? [
                      h(
                        'div',
                        { class: cm.flex({ align: 'center', gap: 'sm' }) },
                        slotOrProp(slots.actions, props.actions),
                      ),
                    ]
                  : []),
              ]),
            ]),
          ],
        },
      )
    }
  },
})
