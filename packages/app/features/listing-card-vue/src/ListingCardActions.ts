/**
 * Vue listing card action row — the Vue counterpart of
 * `@molecule/app-listing-card-react`'s `ListingCardActions`: the same props
 * (React names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { slotOrProp } from './slots.js'
import type { ListingCardActionsProps } from './types.js'

/**
 * Bottom action row of a `<ListingCard>` (Add to cart, Save, etc.).
 *
 * @param props - Component props (see {@link ListingCardActionsProps}).
 * @returns The listing card actions component.
 */
export const ListingCardActions = defineComponent({
  name: 'ListingCardActions',
  props: {
    children: null,
    layout: {
      type: String as PropType<ListingCardActionsProps['layout']>,
      default: 'horizontal',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({
              direction: props.layout === 'stacked' ? 'col' : 'row',
              gap: 'sm',
              align: 'stretch',
            }),
            cm.sp('p', 3),
            props.className,
          ),
        },
        slotOrProp(slots.default, props.children),
      )
  },
})
