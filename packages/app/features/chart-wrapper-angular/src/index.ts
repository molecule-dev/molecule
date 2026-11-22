/**
 * Angular `ChartCard` + `ChartLegend` wrappers around `@molecule/app-charts` —
 * the counterpart of `@molecule/app-chart-wrapper-react`: the same props and
 * the same DOM for the same input.
 *
 * Exports:
 * - `<ChartCard>` — uniform chrome (title / description / actions / summary /
 *   body / footer) around a chart rendering. `minChartHeight` (default 240)
 *   stops responsive charts collapsing; `dataMolId` sets `data-mol-id`.
 * - `<ChartLegend>` — swatch + label (+ value) legend. Items become toggle
 *   buttons when `onToggle` is provided.
 * - `ChartLegendItem` type.
 *
 * These wrappers provide ONLY the surrounding chrome. The chart itself is
 * whatever you project as the card's default content — typically a canvas
 * driven by `createLineChart`/`createBarChart` from `@molecule/app-charts`
 * (via a real bonded ChartProvider) or your own chart component. There is no
 * `<BarChart>` component in `@molecule/app-charts`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   ChartCard,
 *   ChartLegend,
 *   type ChartLegendItem,
 * } from '@molecule/app-chart-wrapper-angular'
 *
 * @Component({
 *   selector: 'app-revenue-chart',
 *   standalone: true,
 *   imports: [ChartCard, ChartLegend],
 *   template: `
 *     <div mol-chart-card [minChartHeight]="240">
 *       <h3 slot="title">Monthly Revenue</h3>
 *       <p slot="description">Last 12 months</p>
 *       <canvas #canvas height="240"></canvas>
 *       <div slot="footer">
 *         <div mol-chart-legend
 *           [items]="items"
 *           (onToggle)="toggle($event)"
 *         ></div>
 *       </div>
 *     </div>
 *   `,
 * })
 * export class RevenueChart {
 *   readonly items: ChartLegendItem[] = [
 *     { id: 'revenue', label: 'Revenue', color: 'var(--chart-1)' },
 *     { id: 'costs', label: 'Costs', color: 'var(--chart-2)' },
 *   ]
 *
 *   readonly toggle = (id: string): void => {
 *     console.log('toggle series', id)
 *   }
 * }
 * ```
 *
 * @remarks
 * `@molecule/app-charts`' built-in provider renders a non-functional placeholder
 * notice (and logs a one-time console warning), not a real chart. Bond the
 * Chart.js provider once at startup — `import { provider } from
 * '@molecule/app-charts-chartjs'; setProvider(provider)` — so `createChart` /
 * `createBarChart` draw real charts (or render your own chart component as the
 * default content). Legend `items` labels/values are plain text or projected
 * template references; pass translated strings via `t()`.
 * Node props are projected content: `title`, `description`, `actions`,
 * `summary` and `footer` are selected by `[slot=<name>]`, everything else lands
 * in the chart body as the default projection.
 *
 * @module
 */

export * from './chart-card.component.js'
export * from './chart-legend.component.js'
export * from './types.js'
