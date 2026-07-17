/**
 * Chart interface for molecule.dev.
 *
 * A framework-agnostic, imperative charting API: `createChart(container,
 * config)` plus shorthands (`createLineChart`, `createBarChart`,
 * `createPieChart`, `createDoughnutChart`, `createAreaChart`,
 * `createScatterChart`, `createRadarChart`), color utilities
 * (`colorPalettes`, `getColor`, `generateColors`), and a swappable
 * `ChartProvider` contract so any chart library (Chart.js, Recharts, D3,
 * uPlot, …) can back the same calls.
 *
 * @example
 * ```tsx
 * import { useEffect, useRef } from 'react'
 * import { createLineChart } from '@molecule/app-charts'
 *
 * export function RevenueChart() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null)
 *   useEffect(() => {
 *     if (!canvasRef.current) return
 *     const chart = createLineChart(canvasRef.current, {
 *       labels: ['Jan', 'Feb', 'Mar', 'Apr'],
 *       datasets: [{ label: 'Revenue', data: [4200, 5800, 5100, 7300] }],
 *     })
 *     return () => chart.destroy()
 *   }, [])
 *   return <canvas ref={canvasRef} width={600} height={300} />
 * }
 * ```
 *
 * @remarks
 * **The built-in default provider does NOT draw real charts.** If no provider
 * is bonded, every `create*Chart` call paints a non-functional placeholder
 * notice onto the canvas (e.g. "bar chart — placeholder" / "No chart provider
 * bonded") and logs a one-time, actionable `console.warn` — it never silently
 * pretends to render. For real charts, bond **`@molecule/app-charts-chartjs`**
 * (Chart.js — line/bar/pie/doughnut/area/scatter/bubble/radar/polar) at startup:
 * `import { provider } from '@molecule/app-charts-chartjs'` then
 * `setProvider(provider)` (same as `bond('charts', provider)`) in `bonds.ts`,
 * BEFORE any component calls `createChart`. All `create*Chart` calls then route
 * through it unchanged. (To use a different library, implement the
 * `ChartProvider` interface around it — but the Chart.js bond covers the common
 * cases.) Do not import a chart library directly in screens/components — keep it
 * behind the provider so it stays swappable.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Every chart on the app's screens renders with real data — no blank
 *   canvas, no NaN/undefined axis labels.
 * - [ ] Plotted values match the data: spot-check at least one point/bar/slice
 *   against a number you can verify elsewhere in the UI.
 * - [ ] Charts update when their inputs change (date range, filter, or a newly
 *   created record that should appear).
 * - [ ] An empty dataset renders an empty state or zeroed axes — not a crash
 *   or a stale chart from previous data.
 * - [ ] Tooltips and legends (where enabled) show the correct labels and
 *   values on hover.
 * - [ ] Resizing the window/panel keeps charts legible (no overflow, no
 *   zero-height canvas).
 *
 * @module
 */

export * from './chart.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
