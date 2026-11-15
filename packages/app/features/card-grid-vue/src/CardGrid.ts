/**
 * Vue `CardGrid`: the generic responsive card grid — the Vue counterpart of
 * `@molecule/app-card-grid-react`'s `CardGrid`, with the same props (React
 * names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { CardGridProps } from './types.js'

/**
 * Resolves the cards that may arrive as the default slot or as a `children`
 * prop: the slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The default slot render function, when the caller passed one.
 * @param prop - The `children` prop, when the caller passed it.
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
 * Generic responsive card grid. Collapses to one column on narrow viewports
 * and grows to `columns` on md+. Typical uses: product grids, post grids,
 * dashboard widget rows.
 *
 * @param props - Component props (see {@link CardGridProps}).
 * @returns The card grid component.
 */
export const CardGrid = defineComponent({
  name: 'CardGrid',
  props: {
    children: null,
    columns: {
      type: Number as PropType<CardGridProps['columns']>,
      default: 3,
    },
    gap: {
      type: String as PropType<CardGridProps['gap']>,
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
