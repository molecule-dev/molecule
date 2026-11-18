/**
 * Vue grid for KPI cards — the counterpart of `@molecule/app-kpi-card-react`'s
 * `KpiCardGrid`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Grid for KPI cards — a fixed `columns`-column grid at every viewport
 * width (it does not collapse on narrow viewports). Gap and column count
 * are tokens resolved against the wired ClassMap.
 *
 * @param props - Component props (see `KpiCardGridProps`).
 * @returns The KPI card grid component.
 */
export const KpiCardGrid = defineComponent({
  name: 'KpiCardGrid',
  props: {
    columns: {
      type: Number as PropType<2 | 3 | 4 | 5 | 6>,
      default: 4,
    },
    gap: {
      type: String as PropType<'xs' | 'sm' | 'md' | 'lg'>,
      default: 'md',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(cm.grid({ cols: props.columns, gap: props.gap }), props.className),
        },
        slots.default?.(),
      )
  },
})
