/**
 * Vue `BentoGrid`: the col/row-span or named-areas layout — the Vue
 * counterpart of `@molecule/app-card-grid-react`'s `BentoGrid`, with the same
 * props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { BentoGridProps } from './types.js'

/**
 * Bento-style grid — items span multiple cells for a magazine / dashboard
 * layout. Works in two modes: (a) col/row-span driven, (b) named-areas
 * driven via the `areas` prop.
 *
 * @param props - Component props (see {@link BentoGridProps}).
 * @returns The bento grid component.
 */
export const BentoGrid = defineComponent({
  name: 'BentoGrid',
  props: {
    items: {
      type: Array as PropType<BentoGridProps['items']>,
      required: true,
    },
    areas: String,
    columns: {
      type: Number,
      default: 12,
    },
    gap: {
      type: String as PropType<BentoGridProps['gap']>,
      default: 'md',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode => {
      const gridStyle = props.areas
        ? { display: 'grid', gridTemplateAreas: props.areas }
        : { display: 'grid', gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))` }
      return h(
        'div',
        { class: cm.cn(cm.grid({ gap: props.gap }), props.className), style: gridStyle },
        props.items.map((it) => {
          // React writes `{ gridArea: it.area }`; an absent area renders no
          // style declaration at all, so an empty style object is equivalent.
          const itemStyle = props.areas
            ? it.area !== undefined
              ? { gridArea: it.area }
              : {}
            : { gridColumn: `span ${it.colSpan ?? 4}`, gridRow: `span ${it.rowSpan ?? 1}` }
          return h('div', { key: it.id, style: itemStyle }, [it.content])
        }),
      )
    }
  },
})
