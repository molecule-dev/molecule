/**
 * Chart interface for molecule.dev.
 *
 * Provides a unified API for data visualization that works with
 * different chart libraries (Chart.js, Recharts, D3, etc.).
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
