# @molecule/app-charts

Chart interface for molecule.dev.

Provides a unified API for data visualization that works with
different chart libraries (Chart.js, Recharts, D3, etc.).

## Type
`feature`

## Installation
```bash
npm install @molecule/app-charts
```

## API

### Interfaces

#### `AnimationConfig`

Chart animation settings (duration, easing, delay, loop, disable).

```typescript
interface AnimationConfig {
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
```

#### `AxisConfig`

Chart axis settings (type, title, min/max, grid, ticks, stacking, time unit).

```typescript
interface AxisConfig {
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
```

#### `ChartConfig`

Full chart configuration (type, datasets, labels, axes, legend, tooltip, animation, responsive).

```typescript
interface ChartConfig {
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
```

#### `ChartInstance`

Live chart instance with update, resize, destroy, dataset manipulation, and image export.

```typescript
interface ChartInstance {
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
```

#### `ChartProvider`

Chart provider interface.

```typescript
interface ChartProvider {
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
```

#### `DataPoint`

Data point for a chart.

```typescript
interface DataPoint {
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
```

#### `Dataset`

Dataset for a chart.

```typescript
interface Dataset {
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
```

#### `FontConfig`

Chart font settings (family, size, weight, style).

```typescript
interface FontConfig {
  family?: string
  size?: number
  weight?: 'normal' | 'bold' | number
  style?: 'normal' | 'italic'
}
```

#### `LegendConfig`

Chart legend settings (display, position, alignment, label styling, click handler).

```typescript
interface LegendConfig {
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
```

#### `TooltipConfig`

Chart tooltip settings (mode, position, colors, border, padding, custom callbacks).

```typescript
interface TooltipConfig {
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
```

### Types

#### `ChartType`

Available chart visualization types (line, bar, pie, doughnut, area, scatter, radar, polar).

```typescript
type ChartType =
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
```

### Functions

#### `createAreaChart(container, config)`

Creates an area chart (shorthand that sets type to 'area').

```typescript
function createAreaChart(container: HTMLCanvasElement | HTMLElement, config: Omit<ChartConfig, "type">): ChartInstance
```

- `container` — The DOM element to render the chart into.
- `config` — The chart configuration (type is set automatically).

**Returns:** The created area chart instance.

#### `createBarChart(container, config)`

Creates a bar chart (shorthand that sets type to 'bar').

```typescript
function createBarChart(container: HTMLCanvasElement | HTMLElement, config: Omit<ChartConfig, "type">): ChartInstance
```

- `container` — The DOM element to render the chart into.
- `config` — The chart configuration (type is set automatically).

**Returns:** The created bar chart instance.

#### `createChart(container, config)`

Creates a chart using the active provider.

```typescript
function createChart(container: HTMLCanvasElement | HTMLElement, config: ChartConfig): ChartInstance
```

- `container` — The DOM element to render the chart into.
- `config` — The chart configuration including type, data, and options.

**Returns:** The created chart instance with update and destroy methods.

#### `createDoughnutChart(container, config)`

Creates a doughnut chart (shorthand that sets type to 'doughnut').

```typescript
function createDoughnutChart(container: HTMLCanvasElement | HTMLElement, config: Omit<ChartConfig, "type">): ChartInstance
```

- `container` — The DOM element to render the chart into.
- `config` — The chart configuration (type is set automatically).

**Returns:** The created doughnut chart instance.

#### `createLineChart(container, config)`

Creates a line chart (shorthand that sets type to 'line').

```typescript
function createLineChart(container: HTMLCanvasElement | HTMLElement, config: Omit<ChartConfig, "type">): ChartInstance
```

- `container` — The DOM element to render the chart into.
- `config` — The chart configuration (type is set automatically).

**Returns:** The created line chart instance.

#### `createPieChart(container, config)`

Creates a pie chart (shorthand that sets type to 'pie').

```typescript
function createPieChart(container: HTMLCanvasElement | HTMLElement, config: Omit<ChartConfig, "type">): ChartInstance
```

- `container` — The DOM element to render the chart into.
- `config` — The chart configuration (type is set automatically).

**Returns:** The created pie chart instance.

#### `createRadarChart(container, config)`

Creates a radar chart (shorthand that sets type to 'radar').

```typescript
function createRadarChart(container: HTMLCanvasElement | HTMLElement, config: Omit<ChartConfig, "type">): ChartInstance
```

- `container` — The DOM element to render the chart into.
- `config` — The chart configuration (type is set automatically).

**Returns:** The created radar chart instance.

#### `createScatterChart(container, config)`

Creates a scatter chart (shorthand that sets type to 'scatter').

```typescript
function createScatterChart(container: HTMLCanvasElement | HTMLElement, config: Omit<ChartConfig, "type">): ChartInstance
```

- `container` — The DOM element to render the chart into.
- `config` — The chart configuration (type is set automatically).

**Returns:** The created scatter chart instance.

#### `createSimpleChartProvider(options)`

Creates a simple canvas-based chart provider.
This is a basic fallback - for production use, prefer dedicated providers.

```typescript
function createSimpleChartProvider(options?: SimpleChartProviderOptions): ChartProvider
```

- `options` — Custom placeholder labels and descriptions for the fallback renderer.

**Returns:** A chart provider that renders basic canvas placeholders.

#### `generateColors(count, palette)`

Generates colors for a dataset.

```typescript
function generateColors(count: number, palette?: "default" | "pastel" | "vivid" | "cool" | "warm" | "monochrome"): string[]
```

- `count` — The number of colors to generate.
- `palette` — The named color palette to draw from.

**Returns:** An array of hex color strings cycling through the palette.

#### `getColor(index, palette)`

Gets a color from a palette.

```typescript
function getColor(index: number, palette?: "default" | "pastel" | "vivid" | "cool" | "warm" | "monochrome"): string
```

- `index` — The color index (wraps around if it exceeds palette length).
- `palette` — The named color palette to pick from.

**Returns:** The hex color string at the given index.

#### `getProvider()`

Gets the current chart provider. Falls back to a simple built-in provider if none has been bonded.

```typescript
function getProvider(): ChartProvider
```

**Returns:** The active chart provider instance.

#### `hasProvider()`

Checks if a chart provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a chart provider is currently registered.

#### `setProvider(provider)`

Sets the chart provider.

```typescript
function setProvider(provider: ChartProvider): void
```

- `provider` — The chart provider implementation to bond.

### Constants

#### `colorPalettes`

Color palette presets.

```typescript
const colorPalettes: { default: string[]; pastel: string[]; vivid: string[]; cool: string[]; warm: string[]; monochrome: string[]; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` 1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-charts`.
