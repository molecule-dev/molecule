/**
 * React ChartCard + ChartLegend wrappers around @molecule/app-charts.
 *
 * Exports:
 * - `<ChartCard>` — uniform chrome (title / description / actions / summary /
 *   body / footer) around a chart rendering.
 * - `<ChartLegend>` — swatch + label (+ value) legend with optional toggle.
 * - `ChartLegendItem` type.
 *
 * The chart library itself comes from the `@molecule/app-charts` bond;
 * these wrappers only provide surrounding chrome.
 *
 * @module
 */

export * from './ChartCard.js'
export * from './ChartLegend.js'
