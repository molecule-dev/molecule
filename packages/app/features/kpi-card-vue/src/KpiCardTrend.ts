/**
 * Vue arrow + delta trend indicator — the counterpart of
 * `@molecule/app-kpi-card-react`'s `KpiCardTrend`: the same props (React
 * names), the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { KpiTrendDirection } from './types.js'

/**
 * The arrow glyph for a direction — no color is applied.
 *
 * @param direction - The trend direction.
 * @returns The arrow character.
 */
const arrow = (direction: KpiTrendDirection): string =>
  direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–'

/**
 * Tiny arrow + delta% rendered inside a `<KpiCard>`'s trend slot.
 * The `direction` only picks the arrow glyph — no color is applied; pass a
 * semantic text color via `className` for red/green deltas.
 *
 * @param props - Component props (see `KpiCardTrendProps`).
 * @returns The trend indicator component.
 */
export const KpiCardTrend = defineComponent({
  name: 'KpiCardTrend',
  props: {
    delta: {
      type: Number,
      required: true,
    },
    direction: {
      type: String as PropType<KpiTrendDirection>,
    },
    suffix: {
      type: String,
      default: '%',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    /**
     * The effective direction (React's explicit override, else the delta's sign).
     *
     * @returns The trend direction.
     */
    const direction = (): KpiTrendDirection =>
      props.direction ?? (props.delta > 0 ? 'up' : props.delta < 0 ? 'down' : 'flat')

    return (): VNode =>
      h(
        'span',
        {
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            props.className,
          ),
        },
        [
          h('span', { 'aria-hidden': 'true' }, arrow(direction())),
          h('span', {}, `${Math.abs(props.delta)}${props.suffix}`),
        ],
      )
  },
})
