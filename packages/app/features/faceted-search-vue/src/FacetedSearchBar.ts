/**
 * Vue fixed filter-bar container.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { childrenOf } from './node.js'

/**
 * Fixed-position horizontal container for a row of faceted-search primitives
 * (segmented control, filter pills, more-filters drawer). Children compose
 * freely.
 *
 * Vue counterpart of `@molecule/app-faceted-search-react`'s `FacetedSearchBar`
 * — the same props (React names), the same ClassMap tokens and the same DOM
 * for the same input.
 *
 * @param props - Component props (see {@link FacetedSearchBarProps}).
 * @returns The filter-bar component.
 */
export const FacetedSearchBar = defineComponent({
  name: 'FacetedSearchBar',
  // As in React (which never spreads unknown props onto an element): a prop
  // this component does not declare must not leak onto the container.
  inheritAttrs: false,
  props: {
    children: null,
    topOffsetPx: {
      type: Number as PropType<number>,
      default: 64,
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          'data-mol-id': 'filter-bar',
          style: { top: `${props.topOffsetPx}px` },
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.surface,
            cm.w('full'),
            cm.facetedSearchBar,
            props.className,
          ),
        },
        slots.default ? slots.default() : childrenOf(props.children),
      )
  },
})
