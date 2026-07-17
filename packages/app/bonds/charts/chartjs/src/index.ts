/**
 * `@molecule/app-charts-chartjs` — a Chart.js-backed provider for the
 * `@molecule/app-charts` charting interface. Bond it once at startup and every
 * `createLineChart` / `createBarChart` / … call renders a REAL chart (the
 * built-in default provider only paints a "no provider bonded" placeholder).
 *
 * @example
 * ```ts
 * import { setProvider, createLineChart } from '@molecule/app-charts'
 * import { provider } from '@molecule/app-charts-chartjs'
 *
 * setProvider(provider) // wire ONCE at app startup, before any create*Chart call
 *
 * // In a component (React ref + effect), destroy on cleanup:
 * const chart = createLineChart(canvasEl, {
 *   labels: ['Jan', 'Feb', 'Mar'],
 *   datasets: [{ label: 'Revenue', data: [12, 19, 8] }],
 * })
 * // …later: chart.destroy()
 * ```
 *
 * @remarks
 * Renders line/bar/pie/doughnut/area/scatter/bubble/radar/polar natively. `area`
 * is a line chart with `fill: true`; `polar` maps to Chart.js `polarArea`. The
 * remaining molecule chart types (heatmap/treemap/funnel/gauge/candlestick) are
 * NOT in base Chart.js — `createChart` throws an actionable error for them (add a
 * Chart.js plugin, or use a different provider) rather than mis-rendering.
 *
 * ALWAYS `destroy()` the returned `ChartInstance` on unmount — Chart.js attaches
 * canvas + resize listeners, so a chart left undestroyed leaks and re-creating on
 * the same canvas throws "Canvas is already in use".
 *
 * BROWSER-ONLY: it draws to a `<canvas>` and pulls in Chart.js (DOM). Import +
 * wire it from app/client code, never server code.
 *
 * @module
 */

export * from './provider.js'
