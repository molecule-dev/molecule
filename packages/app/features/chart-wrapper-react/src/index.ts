/**
 * React ChartCard + ChartLegend wrappers around `@molecule/app-charts`.
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
 * whatever you render as `children` — typically a canvas driven by
 * `createLineChart`/`createBarChart` from `@molecule/app-charts` (via a real
 * bonded ChartProvider) or your own chart component. There is no `<BarChart>`
 * component in `@molecule/app-charts`.
 *
 * @example
 * ```tsx
 * import { useEffect, useRef } from 'react'
 * import { ChartCard, ChartLegend } from '@molecule/app-chart-wrapper-react'
 * import { createBarChart } from '@molecule/app-charts'
 *
 * function RevenueChart() {
 *   const ref = useRef<HTMLCanvasElement>(null)
 *   useEffect(() => {
 *     if (!ref.current) return
 *     const chart = createBarChart(ref.current, {
 *       labels: ['Jan', 'Feb', 'Mar'],
 *       datasets: [{ label: 'Revenue', data: [4200, 5800, 5100] }],
 *     })
 *     return () => chart.destroy()
 *   }, [])
 *   return <canvas ref={ref} height={240} />
 * }
 *
 * <ChartCard
 *   title="Monthly Revenue"
 *   description="Last 12 months"
 *   footer={
 *     <ChartLegend
 *       items={[
 *         { id: 'revenue', label: 'Revenue', color: '#4f46e5' },
 *         { id: 'expenses', label: 'Expenses', color: '#e11d48' },
 *       ]}
 *     />
 *   }
 * >
 *   <RevenueChart />
 * </ChartCard>
 * ```
 *
 * @remarks
 * `@molecule/app-charts`' built-in provider renders a non-functional placeholder
 * notice (and logs a one-time console warning), not a real chart — wire a real
 * `ChartProvider` (or render your own chart component as `children`) before
 * shipping. Legend `items` labels/values are consumer-provided ReactNodes; pass
 * translated strings via `t()`.
 *
 * @module
 */

export * from './ChartCard.js'
export * from './ChartLegend.js'
