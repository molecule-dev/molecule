/**
 * Vue inline CTA card.
 *
 * Vue counterpart of `@molecule/app-empty-state-react`'s `CtaCard` — the same
 * props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { CtaCardProps } from './types.js'

/**
 * A node as a render list, dropping the values React's `&&` treats as absent.
 *
 * @param node - The node value.
 * @returns The children to render.
 */
const nodesOf = (node: VNodeChild | null | undefined): VNodeChild[] =>
  node != null && node !== '' ? [node] : []

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
): VNodeChild[] => (slot ? slot() : nodesOf(prop))

/**
 * The props this component declares: every {@link CtaCardProps} field, with
 * `null`/`String` runtime validators (`null` accepts any value, so node props
 * are not restricted to one runtime type).
 */
const propsOption = {
  eyebrow: null,
  title: null,
  description: null,
  action: null,
  media: null,
  layout: { type: String as PropType<'vertical' | 'horizontal'>, default: 'vertical' },
  dataMolId: String,
  className: String,
} satisfies Record<keyof CtaCardProps, unknown>

/**
 * A "soft sell" card used to promote a next-step action inside a page body
 * (e.g., "Connect your bank", "Invite teammates").
 *
 * Differs from `<EmptyState>` in being positioned in a list of cards rather
 * than filling the void. Supports a horizontal layout with the media slot
 * beside the text. Node-valued props (`eyebrow`, `title`, `description`,
 * `action`, `media`) arrive as a prop or as the same-named slot.
 *
 * @param props - Component props (see {@link CtaCardProps}).
 * @returns The CTA-card component.
 */
export const CtaCard = defineComponent({
  name: 'CtaCard',
  props: propsOption,
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const media = slotOrProp(slots.media, props.media)
      const eyebrow = slotOrProp(slots.eyebrow, props.eyebrow)
      const title = slotOrProp(slots.title, props.title)
      const description = slotOrProp(slots.description, props.description)
      const action = slotOrProp(slots.action, props.action)
      const horizontal = props.layout === 'horizontal'
      return h(
        'section',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(
            cm.flex({
              direction: horizontal ? 'row' : 'col',
              align: horizontal ? 'center' : 'stretch',
              gap: 'md',
            }),
            cm.sp('p', 6),
            props.className,
          ),
        },
        [
          ...(media.length > 0 ? [h('div', { class: cm.shrink0 }, media)] : []),
          h('div', { class: cm.cn(cm.flex1, cm.stack(2)) }, [
            ...(eyebrow.length > 0
              ? [h('div', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, eyebrow)]
              : []),
            h('h3', { class: cm.cn(cm.textSize('xl'), cm.fontWeight('bold')) }, title),
            ...(description.length > 0 ? [h('p', {}, description)] : []),
            ...(action.length > 0 ? [h('div', { class: cm.sp('mt', 2) }, action)] : []),
          ]),
        ],
      )
    }
  },
})
