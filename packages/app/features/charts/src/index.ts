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
 * @module
 */

export * from './chart.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
