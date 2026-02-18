/**
 * Chart types for molecule.dev.
 *
 * @module
 */

/**
 * Available chart visualization types (line, bar, pie, doughnut, area, scatter, radar, polar).
 */
export type ChartType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'doughnut'
  | 'area'
  | 'scatter'
  | 'bubble'
  | 'radar'
  | 'polar'
  | 'heatmap'
  | 'treemap'
  | 'funnel'
  | 'gauge'
  | 'candlestick'

/**
 * Data point for a chart.
 */
export interface DataPoint {
  /**
   * X-axis value or label.
   */
  x: string | number | Date

  /**
   * Y-axis value.
   */
  y: number

  /**
   * Optional secondary value (for bubble charts, etc.).
   */
  r?: number

  /**
   * Optional label override.
   */
  label?: string

  /**
   * Optional color override.
   */
  color?: string

  /**
   * Additional metadata.
   */
  meta?: Record<string, unknown>
}

/**
 * Dataset for a chart.
 */
export interface Dataset {
  /**
   * Dataset label.
   */
  label: string

  /**
   * Data points.
   */
  data: (number | DataPoint)[]

  /**
   * Background color(s).
   */
  backgroundColor?: string | string[]

  /**
   * Border color(s).
   */
  borderColor?: string | string[]

  /**
   * Border width.
   */
  borderWidth?: number

  /**
   * Fill area under line.
   */
  fill?: boolean | string

  /**
   * Line tension (0 = straight, 1 = curved).
   */
  tension?: number

  /**
   * Point radius.
   */
  pointRadius?: number

  /**
   * Point style.
   */
  pointStyle?: 'circle' | 'cross' | 'rect' | 'triangle' | 'star'

  /**
   * Show/hide dataset.
   */
  hidden?: boolean

  /**
   * Stack group (for stacked charts).
   */
  stack?: string

  /**
   * Y-axis ID (for multi-axis charts).
   */
  yAxisID?: string

  /**
   * X-axis ID (for multi-axis charts).
   */
  xAxisID?: string

  /**
   * Order (z-index).
   */
  order?: number
}

/**
 * Chart font settings (family, size, weight, style).
 */
export interface FontConfig {
  family?: string
  size?: number
  weight?: 'normal' | 'bold' | number
  style?: 'normal' | 'italic'
}

/**
 * Chart axis settings (type, title, min/max, grid, ticks, stacking, time unit).
 */
export interface AxisConfig {
  /**
   * Axis type.
   */
  type?: 'linear' | 'logarithmic' | 'category' | 'time' | 'timeseries'

  /**
   * Axis title.
   */
  title?: {
    display?: boolean
    text?: string
    color?: string
    font?: FontConfig
  }

  /**
   * Min value.
   */
  min?: number

  /**
   * Max value.
   */
  max?: number

  /**
   * Begin at zero.
   */
  beginAtZero?: boolean

  /**
   * Display axis.
   */
  display?: boolean

  /**
   * Grid configuration.
   */
  grid?: {
    display?: boolean
    color?: string
    lineWidth?: number
    drawBorder?: boolean
  }

  /**
   * Ticks configuration.
   */
  ticks?: {
    display?: boolean
    color?: string
    font?: FontConfig
    stepSize?: number
    maxTicksLimit?: number
    callback?: (value: number | string) => string
  }

  /**
   * Stacked axis.
   */
  stacked?: boolean

  /**
   * Position.
   */
  position?: 'top' | 'bottom' | 'left' | 'right'

  /**
   * Time unit (for time axes).
   */
  time?: {
    unit?:
      | 'millisecond'
      | 'second'
      | 'minute'
      | 'hour'
      | 'day'
      | 'week'
      | 'month'
      | 'quarter'
      | 'year'
    displayFormats?: Record<string, string>
    tooltipFormat?: string
  }
}

/**
 * Chart legend settings (display, position, alignment, label styling, click handler).
 */
export interface LegendConfig {
  /**
   * Display legend.
   */
  display?: boolean

  /**
   * Position.
   */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'chartArea'

  /**
   * Align.
   */
  align?: 'start' | 'center' | 'end'

  /**
   * Labels configuration.
   */
  labels?: {
    color?: string
    font?: FontConfig
    padding?: number
    usePointStyle?: boolean
    boxWidth?: number
    boxHeight?: number
  }

  /**
   * Click handler.
   */
  onClick?: (event: unknown, legendItem: unknown, legend: unknown) => void
}

/**
 * Chart tooltip settings (mode, position, colors, border, padding, custom callbacks).
 */
export interface TooltipConfig {
  /**
   * Enable tooltips.
   */
  enabled?: boolean

  /**
   * Tooltip mode.
   */
  mode?: 'point' | 'nearest' | 'index' | 'dataset' | 'x' | 'y'

  /**
   * Intersect.
   */
  intersect?: boolean

  /**
   * Position.
   */
  position?: 'average' | 'nearest'

  /**
   * Background color.
   */
  backgroundColor?: string

  /**
   * Title color.
   */
  titleColor?: string

  /**
   * Body color.
   */
  bodyColor?: string

  /**
   * Border color.
   */
  borderColor?: string

  /**
   * Border width.
   */
  borderWidth?: number

  /**
   * Padding.
   */
  padding?: number

  /**
   * Custom callbacks.
   */
  callbacks?: {
    title?: (context: unknown) => string | string[]
    label?: (context: unknown) => string | string[]
    footer?: (context: unknown) => string | string[]
  }
}

/**
 * Chart animation settings (duration, easing, delay, loop, disable).
 */
export interface AnimationConfig {
  /**
   * Animation duration (ms).
   */
  duration?: number

  /**
   * Easing function.
   */
  easing?:
    | 'linear'
    | 'easeInQuad'
    | 'easeOutQuad'
    | 'easeInOutQuad'
    | 'easeInCubic'
    | 'easeOutCubic'
    | 'easeInOutCubic'
    | 'easeInBounce'
    | 'easeOutBounce'
    | 'easeInOutBounce'

  /**
   * Delay before animation.
   */
  delay?: number

  /**
   * Loop animation.
   */
  loop?: boolean

  /**
   * Disable animations.
   */
  disabled?: boolean
}

/**
 * Full chart configuration (type, datasets, labels, axes, legend, tooltip, animation, responsive).
 */
export interface ChartConfig {
  /**
   * Chart type.
   */
  type: ChartType

  /**
   * Datasets.
   */
  datasets: Dataset[]

  /**
   * Labels (for category charts).
   */
  labels?: (string | number)[]

  /**
   * Chart title.
   */
  title?: {
    display?: boolean
    text?: string
    color?: string
    font?: FontConfig
    padding?: number
    position?: 'top' | 'bottom'
  }

  /**
   * X-axis configuration.
   */
  xAxis?: AxisConfig

  /**
   * Y-axis configuration.
   */
  yAxis?: AxisConfig

  /**
   * Additional axes (for multi-axis charts).
   */
  axes?: Record<string, AxisConfig>

  /**
   * Legend configuration.
   */
  legend?: LegendConfig

  /**
   * Tooltip configuration.
   */
  tooltip?: TooltipConfig

  /**
   * Animation configuration.
   */
  animation?: AnimationConfig

  /**
   * Responsive.
   */
  responsive?: boolean

  /**
   * Maintain aspect ratio.
   */
  maintainAspectRatio?: boolean

  /**
   * Aspect ratio.
   */
  aspectRatio?: number

  /**
   * Padding.
   */
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }

  /**
   * Click handler.
   */
  onClick?: (event: unknown, elements: unknown[], chart: unknown) => void

  /**
   * Hover handler.
   */
  onHover?: (event: unknown, elements: unknown[], chart: unknown) => void
}

/**
 * Live chart instance with update, resize, destroy, dataset manipulation, and image export.
 */
export interface ChartInstance {
  /**
   * Updates the chart with new data/config.
   */
  update(config?: Partial<ChartConfig>): void

  /**
   * Resizes the chart.
   */
  resize(): void

  /**
   * Destroys the chart.
   */
  destroy(): void

  /**
   * Gets the chart as a base64 image.
   */
  toBase64Image(type?: string, quality?: number): string

  /**
   * Gets the underlying chart instance.
   */
  getInstance(): unknown

  /**
   * Shows a dataset.
   */
  showDataset(index: number): void

  /**
   * Hides a dataset.
   */
  hideDataset(index: number): void

  /**
   * Toggles a dataset.
   */
  toggleDataset(index: number): void

  /**
   * Gets visible datasets.
   */
  getVisibleDatasets(): number[]

  /**
   * Sets data for a dataset.
   */
  setData(datasetIndex: number, data: (number | DataPoint)[]): void

  /**
   * Adds a dataset.
   */
  addDataset(dataset: Dataset): void

  /**
   * Removes a dataset.
   */
  removeDataset(index: number): void

  /**
   * Adds data point(s) to all datasets.
   */
  addData(label: string | number, values: number[]): void

  /**
   * Removes data point(s) from all datasets.
   */
  removeData(index?: number): void
}

/**
 * Chart provider interface.
 */
export interface ChartProvider {
  /**
   * Creates a chart instance.
   */
  createChart(container: HTMLCanvasElement | HTMLElement, config: ChartConfig): ChartInstance

  /**
   * Gets the provider name.
   */
  getName(): string

  /**
   * Gets supported chart types.
   */
  getSupportedTypes(): ChartType[]

  /**
   * Registers a plugin.
   */
  registerPlugin?(plugin: unknown): void

  /**
   * Sets global defaults.
   */
  setDefaults?(defaults: Partial<ChartConfig>): void
}
