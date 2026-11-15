/**
 * Types for the Svelte period-over-period stat comparison row.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link ComparisonRow} component. */
export interface ComparisonRowProps {
  /** Label for the metric (e.g. "Revenue"). */
  label: Snippet | string
  /** Current period value (formatted). */
  current: Snippet | string
  /** Previous period value (formatted). */
  previous?: Snippet | string
  /** Numeric delta% — drives direction + color when present. */
  deltaPct?: number
  /** Custom delta formatter. */
  formatDelta?: Snippet<[number]>
  /** Optional sub-text ("vs. last week"). */
  periodLabel?: Snippet | string
  /** Extra classes. */
  className?: string
}
