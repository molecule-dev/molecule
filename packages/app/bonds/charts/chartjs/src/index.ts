/**
 * `@molecule/app-charts-chartjs` — a Chart.js-backed provider for the
 * `@molecule/app-charts` charting interface. Bond it once at startup and every
 * `createLineChart` / `createBarChart` / … call renders a REAL chart (the
 * built-in default provider only paints a "no provider bonded" placeholder).
 *
 * @example
 * ```typescript
 * import { createLineChart, getColor, setProvider } from '@molecule/app-charts'
 * import { provider } from '@molecule/app-charts-chartjs'
 *
 * // Startup: wire ONCE, before any create*Chart call (no key, no options).
 * setProvider(provider)
 *
 * // Browser code: pass a <canvas> (or a container element — a canvas is created inside it).
 * const canvas = document.createElement('canvas')
 * document.body.appendChild(canvas)
 *
 * const chart = createLineChart(canvas, {
 *   labels: ['Jan', 'Feb', 'Mar'],
 *   datasets: [
 *     {
 *       label: 'Revenue', // user-visible: translate with your app's own t() key
 *       data: [12, 19, 8],
 *       borderColor: getColor(0),
 *     },
 *   ],
 * })
 *
 * chart.addData('Apr', [15]) // appends a label + one value per dataset, then redraws
 * chart.destroy() // on unmount — REQUIRED before re-creating a chart on the same canvas
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
