/**
 * Solid `ChartCard` + `ChartLegend` wrappers around `@molecule/app-charts`.
 *
 * Exports:
 * - `ChartCard` — uniform chrome (title / description / actions / summary /
 *   body / footer) around a chart rendering. `minChartHeight` (default 240)
 *   stops responsive charts collapsing; `dataMolId` sets `data-mol-id`.
 * - `ChartLegend` — swatch + label (+ value) legend. Items become toggle
 *   buttons when `onToggle` is provided.
 * - `ChartLegendItem` type.
 *
 * These wrappers provide ONLY the surrounding chrome. The chart itself is
 * whatever you render as `children` — typically a canvas driven by
 * `createLineChart`/`createBarChart` from `@molecule/app-charts` (via a real
 * bonded ChartProvider) or your own chart component. There is no `<BarChart>`
 * component in `@molecule/app-charts`.
 *
 * @example
 * ```tsx
 * import { onCleanup, onMount } from 'solid-js'
 *
 * import { ChartCard, ChartLegend } from '@molecule/app-chart-wrapper-solid'
 * import { createBarChart } from '@molecule/app-charts'
 *
 * export function RevenueChart() {
 *   let canvas: HTMLCanvasElement | undefined
 *   onMount(() => {
 *     if (!canvas) return
 *     const chart = createBarChart(canvas, {
 *       labels: ['Jan', 'Feb', 'Mar'],
 *       datasets: [{ label: 'Revenue', data: [4200, 5800, 5100] }],
 *     })
 *     onCleanup(() => chart.destroy())
 *   })
 *   return <canvas ref={canvas} height={240} />
 * }
 *
 * export function Chart() {
 *   return (
 *     <ChartCard
 *       title="Monthly Revenue"
 *       description="Last 12 months"
 *       footer={
 *         <ChartLegend
 *           items={[
 *             { id: 'revenue', label: 'Revenue', color: '#4f46e5' },
 *             { id: 'expenses', label: 'Expenses', color: '#e11d48' },
 *           ]}
 *         />
 *       }
 *     >
 *       <RevenueChart />
 *     </ChartCard>
 *   )
 * }
 * ```
 *
 * @remarks
 * `@molecule/app-charts`' built-in provider renders a non-functional placeholder
 * notice (and logs a one-time console warning), not a real chart. Bond the
 * Chart.js provider once at startup — `import { provider } from
 * '@molecule/app-charts-chartjs'; setProvider(provider)` — so `createChart` /
 * `createBarChart` draw real charts (or render your own chart component as
 * `children`). Legend `items` labels/values are consumer-provided nodes; pass
 * translated strings via `t()`.
 *
 * @module
 */

export * from './ChartCard.jsx'
export * from './ChartLegend.jsx'
export * from './types.js'
