/**
 * Types of `@molecule/app-sparkline-angular` — the Angular counterpart of
 * `@molecule/app-sparkline-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link Sparkline} — the same props
 * `@molecule/app-sparkline-react` accepts, bound as inputs on the host
 * element.
 */
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
  /**
   * Optional accessible label. Overrides the translated / `defaultValue`
   * `'Trend sparkline'` (prop > `t()` > default).
   */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
