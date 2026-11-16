import type { Snippet } from 'svelte'

/** Props accepted by the {@link ChartCard} component. */
export interface ChartCardProps {
  /** Card heading: a snippet, or a plain string. Required by the component. */
  title: Snippet | string
  /** Optional supporting description: a snippet, or a plain string. */
  description?: Snippet | string
  /** Optional right-aligned actions (range selector, export menu, filter). */
  actions?: Snippet | string
  /** Optional KPI summary row shown between header and chart (e.g. "Total: 12,345 +12%"). */
  summary?: Snippet | string
  /** Chart content — any rendering driven by `@molecule/app-charts`. */
  children: Snippet | string
  /** Optional footer below the chart (legend, source attribution). */
  footer?: Snippet | string
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
  /** Series label: a snippet, or plain text. */
  label: Snippet | string | number
  /** Swatch color (any valid CSS color or ClassMap token string). */
  color: string
  /** Optional value / count display next to the label. */
  value?: Snippet | string | number
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
