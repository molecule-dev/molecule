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
 * @example
 * ```tsx
 * import { ChartCard, ChartLegend } from '@molecule/app-chart-wrapper-react'
 *
 * <ChartCard
 *   title="Monthly Revenue"
 *   description="Last 12 months"
 *   actions={<RangePicker />}
 *   footer={
 *     <ChartLegend
 *       items={[
 *         { id: 'revenue', label: 'Revenue', color: '#4f46e5' },
 *         { id: 'expenses', label: 'Expenses', color: '#e11d48' },
 *       ]}
 *     />
 *   }
 * >
 *   <BarChart data={revenueData} />
 * </ChartCard>
 * ```
 *
 * @module
 */

export * from './ChartCard.js'
export * from './ChartLegend.js'
