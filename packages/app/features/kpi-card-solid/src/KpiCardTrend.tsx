/**
 * Solid arrow + delta trend indicator — the counterpart of
 * `@molecule/app-kpi-card-react`'s `KpiCardTrend`: the same props (React
 * names), the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { KpiCardTrendProps, KpiTrendDirection } from './types.js'

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
 * @param props - Component props (see {@link KpiCardTrendProps}).
 * @returns The rendered trend indicator.
 */
export const KpiCardTrend: Component<KpiCardTrendProps> = (props) => {
  const cm = getClassMap()
  const direction = (): KpiTrendDirection =>
    props.direction ?? (props.delta > 0 ? 'up' : props.delta < 0 ? 'down' : 'flat')
  return (
    <span
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('sm'),
        cm.fontWeight('semibold'),
        props.className,
      )}
    >
      <span aria-hidden="true">{arrow(direction())}</span>
      <span>{`${Math.abs(props.delta)}${props.suffix ?? '%'}`}</span>
    </span>
  )
}
