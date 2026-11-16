/**
 * Types of `@molecule/app-chart-wrapper-angular` — the Angular counterpart of
 * `@molecule/app-chart-wrapper-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Props accepted by {@link ChartCard} — the same props
 * `@molecule/app-chart-wrapper-react` accepts. Node props (`title`,
 * `description`, `actions`, `summary`, `footer`, `children`) are projected
 * content in Angular (an input cannot carry an element), so they are typed
 * `unknown`: pass them in the host template, not as values.
 */
export interface ChartCardProps {
  /** Card heading, projected as `[slot=title]` content (or a string input). */
  title?: unknown
  /** Optional supporting description, projected as `[slot=description]` content. */
  description?: unknown
  /** Optional right-aligned actions, projected as `[slot=actions]` content. */
  actions?: unknown
  /** Optional KPI summary row, projected as `[slot=summary]` content. */
  summary?: unknown
  /** Chart content, projected as the element's default content. */
  children?: unknown
  /** Optional footer, projected as `[slot=footer]` content. */
  footer?: unknown
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
  /** Series label: plain text, or projected markup as a template reference. */
  label: string | number | TemplateRef<unknown>
  /** Swatch color (any valid CSS color or ClassMap token string). */
  color: string
  /** Optional value / count display next to the label. */
  value?: string | number | TemplateRef<unknown>
  /** Whether the series is hidden (greyed out). */
  hidden?: boolean
}

/** Props accepted by {@link ChartLegend}. */
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
