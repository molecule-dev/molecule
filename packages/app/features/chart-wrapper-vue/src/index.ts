/**
 * Vue `ChartCard` + `ChartLegend` wrappers around `@molecule/app-charts`.
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
 * whatever you render as the default slot — typically a canvas driven by
 * `createLineChart`/`createBarChart` from `@molecule/app-charts` (via a real
 * bonded ChartProvider) or your own chart component. There is no `<BarChart>`
 * component in `@molecule/app-charts`.
 *
 * @example
 * ```ts
 * import { defineComponent, h, onMounted, onBeforeUnmount, ref } from 'vue'
 *
 * import { ChartCard, ChartLegend } from '@molecule/app-chart-wrapper-vue'
 * import { createBarChart } from '@molecule/app-charts'
 *
 * const RevenueChart = defineComponent({
 *   setup() {
 *     const el = ref<HTMLCanvasElement | null>(null)
 *     let chart: { destroy(): void } | undefined
 *     onMounted(() => {
 *       if (!el.value) return
 *       chart = createBarChart(el.value, {
 *         labels: ['Jan', 'Feb', 'Mar'],
 *         datasets: [{ label: 'Revenue', data: [4200, 5800, 5100] }],
 *       })
 *     })
 *     onBeforeUnmount(() => chart?.destroy())
 *     return () => h('canvas', { ref: el, height: 240 })
 *   },
 * })
 *
 * const Chart = defineComponent({
 *   setup() {
 *     return () =>
 *       h(
 *         ChartCard,
 *         { title: 'Monthly Revenue', description: 'Last 12 months' },
 *         {
 *           default: () => [h(RevenueChart)],
 *           footer: () => [
 *             h(ChartLegend, {
 *               items: [
 *                 { id: 'revenue', label: 'Revenue', color: '#4f46e5' },
 *                 { id: 'expenses', label: 'Expenses', color: '#e11d48' },
 *               ],
 *             }),
 *           ],
 *         },
 *       )
 *   },
 * })
 * ```
 *
 * @remarks
 * `@molecule/app-charts`' built-in provider renders a non-functional placeholder
 * notice (and logs a one-time console warning), not a real chart. Bond the
 * Chart.js provider once at startup — `import { provider } from
 * '@molecule/app-charts-chartjs'; setProvider(provider)` — so `createChart` /
 * `createBarChart` draw real charts (or render your own chart component as the
 * default slot). Legend `items` labels/values are consumer-provided nodes; pass
 * translated strings via `t()`. Node-valued props (`title`, `description`,
 * `actions`, `summary`, `footer`) arrive as a prop AND a same-named slot;
 * components accept either.
 *
 * @module
 */

export * from './ChartCard.js'
export * from './ChartLegend.js'
export * from './types.js'
