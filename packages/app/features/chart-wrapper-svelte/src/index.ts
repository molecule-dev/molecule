/**
 * Svelte `ChartCard` + `ChartLegend` wrappers around `@molecule/app-charts`.
 *
 * Exports:
 * - `ChartCard` — uniform chrome (title / description / actions / summary /
 *   body / footer) around a chart rendering. `minChartHeight` (default 240)
 *   stops responsive charts collapsing; `dataMolId` sets `data-mol-id`.
 * - `ChartLegend` — swatch + label (+ value) legend. Items become toggle
 *   buttons when `onToggle` is provided.
 * - `ChartLegendItem` type.
 *
 * These wrappers provide ONLY the surrounding chrome. The chart itself is
 * whatever you render as the default content — typically a canvas driven by
 * `createLineChart`/`createBarChart` from `@molecule/app-charts` (via a real
 * bonded ChartProvider) or your own chart component. There is no `<BarChart>`
 * component in `@molecule/app-charts`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { onMount } from 'svelte'
 *
 *   import { ChartCard, ChartLegend } from '@molecule/app-chart-wrapper-svelte'
 *   import { createBarChart } from '@molecule/app-charts'
 *
 *   let canvas: HTMLCanvasElement
 *   onMount(() => {
 *     const chart = createBarChart(canvas, {
 *       labels: ['Jan', 'Feb', 'Mar'],
 *       datasets: [{ label: 'Revenue', data: [4200, 5800, 5100] }],
 *     })
 *     return () => chart.destroy()
 *   })
 * </script>
 *
 * <ChartCard title="Monthly Revenue" description="Last 12 months">
 *   {#snippet footer()}
 *     <ChartLegend
 *       items={[
 *         { id: 'revenue', label: 'Revenue', color: '#4f46e5' },
 *         { id: 'expenses', label: 'Expenses', color: '#e11d48' },
 *       ]}
 *     />
 *   {/snippet}
 *   <canvas bind:this={canvas} height={240}></canvas>
 * </ChartCard>
 * ```
 *
 * @remarks
 * `@molecule/app-charts`' built-in provider renders a non-functional placeholder
 * notice (and logs a one-time console warning), not a real chart. Bond the
 * Chart.js provider once at startup — `import { provider } from
 * '@molecule/app-charts-chartjs'; setProvider(provider)` — so `createChart` /
 * `createBarChart` draw real charts (or render your own chart component as the
 * default content). Legend `items` labels/values are consumer-provided nodes;
 * pass translated strings via `t()`. Node-valued props (`title`, `description`,
 * `actions`, `summary`, `footer`) are snippet props.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
