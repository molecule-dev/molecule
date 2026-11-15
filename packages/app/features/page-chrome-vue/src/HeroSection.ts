/**
 * Vue dashboard / landing hero: text column on the left, optional media on the
 * right.
 *
 * Vue counterpart of `@molecule/app-page-chrome-react`'s `HeroSection` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The nodes to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Resolves an optional slot-or-prop pair the way React's truthy `&&` guard
 * does: nothing when the prop is absent or falsy, and nothing for an empty
 * slot.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The nodes to render, or null when React would render no wrapper.
 */
const optional = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] | null => {
  if (slot) {
    const nodes = slot()
    return nodes.length > 0 ? nodes : null
  }
  return prop ? [prop] : null
}

/**
 * Dashboard / landing hero. Text column on the left, optional media on
 * the right. Alignment defaults to `start` for dashboards; use
 * `align="center"` for marketing-style landing heroes.
 *
 * @param props - Component props (see {@link HeroSectionProps}).
 * @returns The hero section component.
 */
export const HeroSection = defineComponent({
  name: 'HeroSection',
  props: {
    eyebrow: null,
    title: null,
    description: null,
    primaryAction: null,
    secondaryAction: null,
    media: null,
    align: {
      type: String as PropType<'start' | 'center'>,
      default: 'start',
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const eyebrow = optional(slots.eyebrow, props.eyebrow)
      const description = optional(slots.description, props.description)
      const primaryAction = slotOrProp(slots.primaryAction, props.primaryAction)
      const secondaryAction = slotOrProp(slots.secondaryAction, props.secondaryAction)
      const actions =
        primaryAction.length > 0 || secondaryAction.length > 0
          ? [...primaryAction, ...secondaryAction]
          : null
      const media = optional(slots.media, props.media)
      return h(
        'section',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(
            cm.flex({
              align: 'center',
              justify: media ? 'between' : 'start',
              gap: 'lg',
              wrap: 'wrap',
            }),
            cm.sp('py', 10),
            props.className,
          ),
        },
        [
          h(
            'div',
            {
              class: cm.cn(
                cm.stack(4),
                cm.flex1,
                props.align === 'center' ? cm.textCenter : undefined,
              ),
            },
            [
              eyebrow
                ? h('div', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, eyebrow)
                : null,
              h(
                'h1',
                { class: cm.cn(cm.textSize('4xl'), cm.fontWeight('bold')) },
                slotOrProp(slots.title, props.title),
              ),
              description
                ? h('p', { class: cm.cn(cm.textSize('lg'), cm.maxW('2xl')) }, description)
                : null,
              actions
                ? h(
                    'div',
                    { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) },
                    actions,
                  )
                : null,
            ],
          ),
          media ? h('div', { class: cm.shrink0 }, media) : null,
        ],
      )
    }
  },
})
