/**
 * Chart.js implementation of the `@molecule/app-charts` `ChartProvider`.
 *
 * @module
 */

import {
  Chart,
  type ChartConfiguration,
  type ChartDataset,
  type ChartType as ChartJsType,
  registerables,
} from 'chart.js'

import type {
  ChartConfig,
  ChartInstance,
  ChartProvider,
  ChartType,
  DataPoint,
  Dataset,
} from '@molecule/app-charts'

/** Chart.js's global controller/element/scale registration is done once, lazily. */
let registered = false
const ensureRegistered = (): void => {
  if (!registered) {
    Chart.register(...registerables)
    registered = true
  }
}

/**
 * Chart types this bond renders natively via Chart.js. `area` is a line chart
 * with `fill: true`; `polar` maps to Chart.js's `polarArea`. The remaining
 * molecule types (`heatmap`/`treemap`/`funnel`/`gauge`/`candlestick`) need a
 * Chart.js plugin the base library doesn't ship, so `createChart` throws an
 * actionable error for them rather than rendering something wrong.
 */
const TYPE_MAP: Partial<Record<ChartType, ChartJsType>> = {
  line: 'line',
  bar: 'bar',
  pie: 'pie',
  doughnut: 'doughnut',
  area: 'line',
  scatter: 'scatter',
  bubble: 'bubble',
  radar: 'radar',
  polar: 'polarArea',
}

const SUPPORTED_TYPES: ChartType[] = [
  'line',
  'bar',
  'pie',
  'doughnut',
  'area',
  'scatter',
  'bubble',
  'radar',
  'polar',
]

/** Resolves (or creates) the `<canvas>` Chart.js draws into. */
const resolveCanvas = (container: HTMLCanvasElement | HTMLElement): HTMLCanvasElement => {
  if (container instanceof HTMLCanvasElement) return container
  const existing = container.querySelector('canvas')
  if (existing) return existing
  const canvas = document.createElement('canvas')
  container.appendChild(canvas)
  return canvas
}

/** Maps a molecule `Dataset` to a Chart.js dataset, honouring `area` fill. */
const toChartJsDataset = (dataset: Dataset, isArea: boolean): ChartDataset => {
  const data = dataset.data.map((point) =>
    typeof point === 'number' ? point : { x: point.x, y: point.y, r: point.r },
  )
  return {
    label: dataset.label,
    data: data as number[],
    backgroundColor: dataset.backgroundColor,
    borderColor: dataset.borderColor,
    borderWidth: dataset.borderWidth,
    // `area` = line + fill unless the dataset overrides it.
    fill: dataset.fill ?? (isArea ? true : undefined),
    tension: dataset.tension,
    pointRadius: dataset.pointRadius,
    pointStyle: dataset.pointStyle,
    hidden: dataset.hidden,
    stack: dataset.stack,
    yAxisID: dataset.yAxisID,
    xAxisID: dataset.xAxisID,
    order: dataset.order,
  } as ChartDataset
}

/** Builds the Chart.js `options` object from a molecule `ChartConfig`. */
const toChartJsOptions = (config: ChartConfig): ChartConfiguration['options'] => {
  const scales: Record<string, unknown> = {}
  if (config.xAxis) scales.x = config.xAxis
  if (config.yAxis) scales.y = config.yAxis
  if (config.axes) Object.assign(scales, config.axes)

  return {
    responsive: config.responsive ?? true,
    maintainAspectRatio: config.maintainAspectRatio ?? false,
    aspectRatio: config.aspectRatio,
    animation: config.animation?.disabled
      ? false
      : config.animation
        ? {
            duration: config.animation.duration,
            easing: config.animation.easing,
            delay: config.animation.delay,
          }
        : undefined,
    onClick: config.onClick,
    onHover: config.onHover,
    plugins: {
      title: config.title,
      legend: config.legend,
      tooltip: config.tooltip,
    },
    ...(Object.keys(scales).length > 0 ? { scales } : {}),
  } as ChartConfiguration['options']
}

/** Builds the full Chart.js configuration from a molecule `ChartConfig`. */
const toChartJsConfig = (config: ChartConfig): ChartConfiguration => {
  const type = TYPE_MAP[config.type]
  if (!type) {
    throw new Error(
      `@molecule/app-charts-chartjs: chart type "${config.type}" is not supported by Chart.js. ` +
        `Supported: ${SUPPORTED_TYPES.join(', ')}. For ${config.type}, add a Chart.js plugin or a different provider.`,
    )
  }
  const isArea = config.type === 'area'
  return {
    type,
    data: {
      labels: config.labels,
      datasets: config.datasets.map((d) => toChartJsDataset(d, isArea)),
    },
    options: toChartJsOptions(config),
  }
}

/** Wraps a live Chart.js instance in the molecule `ChartInstance` contract. */
const wrapInstance = (chart: Chart, initialConfig: ChartConfig): ChartInstance => {
  let config = initialConfig
  const isArea = config.type === 'area'
  return {
    update(next?: Partial<ChartConfig>): void {
      if (next) {
        config = { ...config, ...next }
        if (next.labels !== undefined) chart.data.labels = next.labels
        if (next.datasets !== undefined) {
          chart.data.datasets = next.datasets.map((d) => toChartJsDataset(d, isArea))
        }
        if (
          next.title !== undefined ||
          next.legend !== undefined ||
          next.tooltip !== undefined ||
          next.xAxis !== undefined ||
          next.yAxis !== undefined ||
          next.animation !== undefined
        ) {
          Object.assign(chart.options, toChartJsOptions(config))
        }
      }
      chart.update()
    },
    resize: () => chart.resize(),
    destroy: () => chart.destroy(),
    toBase64Image: (type?: string, quality?: number) => chart.toBase64Image(type, quality),
    getInstance: () => chart,
    showDataset: (index: number) => chart.show(index),
    hideDataset: (index: number) => chart.hide(index),
    toggleDataset: (index: number) =>
      chart.isDatasetVisible(index) ? chart.hide(index) : chart.show(index),
    getVisibleDatasets: () =>
      chart.data.datasets.map((_, i) => i).filter((i) => chart.isDatasetVisible(i)),
    setData: (datasetIndex: number, data: (number | DataPoint)[]) => {
      const ds = chart.data.datasets[datasetIndex]
      if (!ds) return
      ds.data = data.map((p) =>
        typeof p === 'number' ? p : { x: p.x, y: p.y, r: p.r },
      ) as number[]
      chart.update()
    },
    addDataset: (dataset: Dataset) => {
      chart.data.datasets.push(toChartJsDataset(dataset, isArea))
      chart.update()
    },
    removeDataset: (index: number) => {
      chart.data.datasets.splice(index, 1)
      chart.update()
    },
    addData: (label: string | number, values: number[]) => {
      chart.data.labels?.push(label)
      chart.data.datasets.forEach((ds, i) => (ds.data as number[]).push(values[i] ?? 0))
      chart.update()
    },
    removeData: (index?: number) => {
      if (index === undefined) {
        chart.data.labels?.pop()
        chart.data.datasets.forEach((ds) => (ds.data as number[]).pop())
      } else {
        chart.data.labels?.splice(index, 1)
        chart.data.datasets.forEach((ds) => (ds.data as number[]).splice(index, 1))
      }
      chart.update()
    },
  }
}

/**
 * Creates a Chart.js-backed `ChartProvider`.
 *
 * @returns A `ChartProvider` that renders real charts via Chart.js.
 */
export const createProvider = (): ChartProvider => ({
  getName: () => 'chartjs',
  getSupportedTypes: () => [...SUPPORTED_TYPES],
  createChart(container: HTMLCanvasElement | HTMLElement, config: ChartConfig): ChartInstance {
    ensureRegistered()
    const canvas = resolveCanvas(container)
    const chart = new Chart(canvas, toChartJsConfig(config))
    return wrapInstance(chart, config)
  },
  registerPlugin(plugin: unknown): void {
    Chart.register(plugin as Parameters<typeof Chart.register>[0])
  },
  setDefaults(defaults: Partial<ChartConfig>): void {
    if (defaults.responsive !== undefined) Chart.defaults.responsive = defaults.responsive
    if (defaults.maintainAspectRatio !== undefined) {
      Chart.defaults.maintainAspectRatio = defaults.maintainAspectRatio
    }
  },
})

/** The default Chart.js chart provider, ready to bond with `setProvider(provider)`. */
export const provider: ChartProvider = createProvider()
