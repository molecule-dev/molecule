/**
 * Solid grid for KPI cards — the counterpart of `@molecule/app-kpi-card-react`'s
 * `KpiCardGrid`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { KpiCardGridProps } from './types.js'

/**
 * Grid for KPI cards — a fixed `columns`-column grid at every viewport
 * width (it does not collapse on narrow viewports). Gap and column count
 * are tokens resolved against the wired ClassMap.
 *
 * @param props - Component props (see {@link KpiCardGridProps}).
 * @returns The rendered KPI card grid.
 */
export const KpiCardGrid: Component<KpiCardGridProps> = (props) => {
  const cm = getClassMap()
  const gridClasses = (): string =>
    cm.cn(cm.grid({ cols: props.columns ?? 4, gap: props.gap ?? 'md' }), props.className)
  return <div class={gridClasses()}>{props.children}</div>
}
