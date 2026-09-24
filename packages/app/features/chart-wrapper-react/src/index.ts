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
 * import { useEffect, useRef, useState } from 'react'
 *
 * import { ChartCard, ChartLegend } from '@molecule/app-chart-wrapper-react'
 * import { type ChartInstance, createBarChart, setProvider } from '@molecule/app-charts'
 * import { provider as chartjsProvider } from '@molecule/app-charts-chartjs'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * setProvider(chartjsProvider) // real charts; the default provider only paints a placeholder
 *
 * const months = ['Jan', 'Feb', 'Mar']
 * const series = [
 *   { id: 'revenue', label: 'Revenue', color: '#4f46e5', data: [4200, 5800, 5100] },
 *   { id: 'expenses', label: 'Expenses', color: '#e11d48', data: [3100, 3400, 3900] },
 * ]
 *
 * export function RevenueCard() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null)
 *   const chartRef = useRef<ChartInstance | null>(null)
 *   const [hidden, setHidden] = useState<string[]>([])
 *
 *   useEffect(() => {
 *     if (!canvasRef.current) return
 *     const chart = createBarChart(canvasRef.current, {
 *       labels: months,
 *       datasets: series.map((s) => ({ label: s.label, data: s.data, backgroundColor: s.color })),
 *       legend: { display: false }, // ChartLegend below replaces the built-in legend
 *     })
 *     chartRef.current = chart
 *     return () => chart.destroy()
 *   }, [])
 *
 *   const toggle = (id: string) => {
 *     chartRef.current?.toggleDataset(series.findIndex((s) => s.id === id))
 *     setHidden((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
 *   }
 *
 *   return (
 *     <ChartCard
 *       title="Monthly revenue"
 *       description="Q1 2026"
 *       footer={
 *         <ChartLegend
 *           items={series.map((s) => ({ id: s.id, label: s.label, color: s.color, hidden: hidden.includes(s.id) }))}
 *           onToggle={toggle}
 *         />
 *       }
 *     >
 *       <canvas ref={canvasRef} height={240} />
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
 * `children`). Legend `items` labels/values are consumer-provided ReactNodes;
 * pass translated strings via `t()`.
 *
 * `ChartLegend` does NOT talk to the chart: `onToggle(id)` only reports the
 * click and `hidden` only greys the item out — hide the series yourself
 * (e.g. `chart.toggleDataset(index)`) and keep `hidden` in state. Without
 * `onToggle` the items are plain spans, not buttons. Both components call
 * `getClassMap()` (throws until `setClassMap(...)` ran); `ChartCard` renders
 * `Card` from `@molecule/app-ui-react`. `minChartHeight` is in pixels.
 *
 * @module
 */

export * from './ChartCard.js'
export * from './ChartLegend.js'
