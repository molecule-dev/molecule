/**
 * Types for the Solid period-over-period stat comparison row.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link ComparisonRow} component. */
export interface ComparisonRowProps {
  /** Label for the metric (e.g. "Revenue"). */
  label: JSX.Element
  /** Current period value (formatted). */
  current: JSX.Element
  /** Previous period value (formatted). */
  previous?: JSX.Element
  /** Numeric delta% — drives direction + color when present. */
  deltaPct?: number
  /** Custom delta formatter. */
  formatDelta?: (deltaPct: number) => JSX.Element
  /** Optional sub-text ("vs. last week"). */
  periodLabel?: JSX.Element
  /** Extra classes. */
  className?: string
}
