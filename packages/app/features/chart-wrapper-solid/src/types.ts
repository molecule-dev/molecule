import type { JSX } from 'solid-js'

/** Props accepted by the {@link ChartCard} component. */
export interface ChartCardProps {
  /** Card heading. */
  title: JSX.Element
  /** Optional supporting description. */
  description?: JSX.Element
  /** Optional right-aligned actions (range selector, export menu, filter). */
  actions?: JSX.Element
  /** Optional KPI summary row shown between header and chart (e.g. "Total: 12,345 +12%"). */
  summary?: JSX.Element
  /** Chart content — any rendering driven by `@molecule/app-charts`. */
  children: JSX.Element
  /** Optional footer below the chart (legend, source attribution). */
  footer?: JSX.Element
  /** Set a minimum chart height so responsive charts don't collapse. Defaults to `240`. */
  minChartHeight?: number
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Describes a single series entry rendered in the chart legend. */
export interface ChartLegendItem {
  /** Series id — the value `onToggle` receives. */
  id: string
  /** Series label. */
  label: JSX.Element
  /** Swatch color (any valid CSS color or ClassMap token string). */
  color: string
  /** Optional value / count display next to the label. */
  value?: JSX.Element
  /** Whether the series is hidden (greyed out). */
  hidden?: boolean
}

/** Props accepted by the {@link ChartLegend} component. */
export interface ChartLegendProps {
  /** The legend's series. */
  items: ChartLegendItem[]
  /** Called when an item is toggled. */
  onToggle?: (id: string) => void
  /** Layout direction. Defaults to `'horizontal'`. */
  layout?: 'horizontal' | 'vertical'
  /** Extra classes. */
  className?: string
}
