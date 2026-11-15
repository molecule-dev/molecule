/**
 * Types for the Svelte tiny inline trend chart.
 *
 * @module
 */

/** Props accepted by the {@link Sparkline} component. */
export interface SparklineProps {
  /** Numeric series — length determines the segment count. */
  values: number[]
  /** Visual variant. */
  variant?: 'line' | 'bar' | 'dot'
  /** SVG width in px. Defaults to 80. */
  width?: number
  /** SVG height in px. Defaults to 24. */
  height?: number
  /** Stroke / fill color. Defaults to currentColor. */
  color?: string
  /** Optional accessible label. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
