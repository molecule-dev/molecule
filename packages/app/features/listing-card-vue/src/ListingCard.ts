/**
 * Vue listing / product card shell — the Vue counterpart of
 * `@molecule/app-listing-card-react`'s `ListingCard`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'

import { slotOrProp } from './slots.js'
import type { ListingCardProps } from './types.js'

/**
 * Product / property / listing card shell. Just a `<Card>` with vertical
 * stacking of its children — typically `<ListingCardMedia>` +
 * `<ListingCardBody>` + `<ListingCardActions>`.
 *
 * A supplied `onClick` makes the whole card cursor-pointer, exactly as React's
 * `cm.cursorPointer` condition does.
 *
 * @param props - Component props (see {@link ListingCardProps}).
 * @returns The listing card component.
 */
export const ListingCard = defineComponent({
  name: 'ListingCard',
  props: {
    children: null,
    onClick: {
      type: Function as PropType<ListingCardProps['onClick']>,
      default: undefined,
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        Card,
        {
          'data-mol-id': props.dataMolId,
          onClick: (event: MouseEvent) => props.onClick?.(event),
          className: cm.cn(props.onClick ? cm.cursorPointer : undefined, props.className),
        },
        {
          default: () => [
            h('div', { class: cm.stack(0) }, slotOrProp(slots.default, props.children)),
          ],
        },
      )
  },
})
