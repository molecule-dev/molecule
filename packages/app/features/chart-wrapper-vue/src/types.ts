/**
 * Types for the Vue chart wrapper — `@molecule/app-chart-wrapper-react`'s prop
 * shapes with Vue's node type.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link ChartCard} component. */
export interface ChartCardProps {
  /**
   * Card heading (a node, also accepted as the same-named slot). Required by
   * the component: one of the prop and the slot must carry it.
   */
  title?: VNodeChild
  /** Optional supporting description (a node, or its same-named slot). */
  description?: VNodeChild
  /** Optional right-aligned actions (range selector, export menu, filter), a node or its slot. */
  actions?: VNodeChild
  /** Optional KPI summary row shown between header and chart, a node or its slot. */
  summary?: VNodeChild
  /** Chart content — the DEFAULT slot. */
  children?: VNodeChild
  /** Optional footer below the chart (legend, source attribution), a node or its slot. */
  footer?: VNodeChild
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
  /** Series label (a node). */
  label: VNodeChild
  /** Swatch color (any valid CSS color or ClassMap token string). */
  color: string
  /** Optional value / count display next to the label (a node). */
  value?: VNodeChild
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
