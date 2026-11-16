/**
 * Vue listing grid — the Vue counterpart of
 * `@molecule/app-listing-card-react`'s `ListingGrid`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { slotOrProp } from './slots.js'
import type { ListingGridProps } from './types.js'

/**
 * Grid for `<ListingCard>`s — a fixed `columns`-column grid at every viewport
 * width.
 *
 * @param props - Component props (see {@link ListingGridProps}).
 * @returns The listing grid component.
 */
export const ListingGrid = defineComponent({
  name: 'ListingGrid',
  props: {
    children: null,
    columns: {
      type: Number as PropType<ListingGridProps['columns']>,
      default: 3,
    },
    gap: {
      type: String as PropType<ListingGridProps['gap']>,
      default: 'md',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        { class: cm.cn(cm.grid({ cols: props.columns, gap: props.gap }), props.className) },
        slotOrProp(slots.default, props.children),
      )
  },
})
