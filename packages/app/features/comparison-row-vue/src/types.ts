/**
 * Types for the Vue period-over-period stat comparison row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link ComparisonRow} component. */
export interface ComparisonRowProps {
  /** Label for the metric (e.g. "Revenue"). */
  label: VNodeChild
  /** Current period value (formatted). */
  current: VNodeChild
  /** Previous period value (formatted). */
  previous?: VNodeChild
  /** Numeric delta% — drives direction + color when present. */
  deltaPct?: number
  /** Custom delta formatter. */
  formatDelta?: (deltaPct: number) => VNodeChild
  /** Optional sub-text ("vs. last week"). */
  periodLabel?: VNodeChild
  /** Extra classes. */
  className?: string
}
