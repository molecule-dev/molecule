/**
 * Vue listing card media slot — the Vue counterpart of
 * `@molecule/app-listing-card-react`'s `ListingCardMedia`: the same props
 * (React names), the same ClassMap tokens, inline styles and DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { slotOrProp } from './slots.js'
import type { ListingCardMediaProps } from './types.js'

/**
 * Media slot at the top of a `<ListingCard>`. Locks the aspect ratio via an
 * inline style, renders the caller's node instead of the `<img>` fallback, and
 * puts `overlay` in an absolutely-positioned inset-0 layer.
 *
 * @param props - Component props (see {@link ListingCardMediaProps}).
 * @returns The listing card media component.
 */
export const ListingCardMedia = defineComponent({
  name: 'ListingCardMedia',
  props: {
    src: String,
    alt: String,
    children: null,
    aspect: {
      type: String as PropType<ListingCardMediaProps['aspect']>,
      default: '4/3',
    },
    overlay: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const media = slotOrProp(slots.default, props.children)
      const overlay = slotOrProp(slots.overlay, props.overlay)
      const image: VNodeChild[] = props.src
        ? [
            h('img', {
              src: props.src,
              alt: props.alt ?? '',
              style: { width: '100%', height: '100%', objectFit: 'cover' },
            }),
          ]
        : []

      return h(
        'div',
        {
          class: cm.cn(cm.position('relative'), props.className),
          style: { aspectRatio: props.aspect.replace('/', ' / ') },
        },
        [
          ...(media.length > 0 ? media : image),
          ...(overlay.length > 0
            ? [h('div', { class: cm.cn(cm.position('absolute'), cm.inset0) }, overlay)]
            : []),
        ],
      )
    }
  },
})
