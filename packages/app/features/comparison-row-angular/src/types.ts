/**
 * Types of `@molecule/app-comparison-row-angular` — the Angular counterpart
 * of `@molecule/app-comparison-row-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Props accepted by {@link ComparisonRow} — the same props
 * `@molecule/app-comparison-row-react` accepts. Node-valued props are
 * projected in Angular (an input cannot carry a node), so they are typed
 * `unknown`: pass a string or number value through the input, and element
 * content in the host template as `[slot=<name>]` content.
 */
export interface ComparisonRowProps {
  /** Label for the metric (e.g. "Revenue"). */
  label?: unknown
  /** Current period value (formatted). */
  current?: unknown
  /** Previous period value (formatted). */
  previous?: unknown
  /** Numeric delta% — drives direction + color when present. */
  deltaPct?: number
  /** Custom delta formatter: a template receiving the delta as `$implicit` / `a0`. */
  formatDelta?: TemplateRef<unknown> | null
  /** Optional sub-text ("vs. last week"). */
  periodLabel?: unknown
  /** Extra classes. */
  className?: string
}
