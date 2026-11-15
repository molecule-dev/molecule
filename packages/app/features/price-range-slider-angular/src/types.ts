/**
 * Types of `@molecule/app-price-range-slider-angular` — the Angular
 * counterpart of `@molecule/app-price-range-slider-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link PriceRangeSlider} — the same props
 * `@molecule/app-price-range-slider-react` accepts. Node props (`label`) are
 * projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them in the host template, not as values.
 */
export interface PriceRangeSliderProps {
  /** Minimum possible value. */
  min: number
  /** Maximum possible value. */
  max: number
  /** Current [low, high] tuple. If only one value is relevant, set low === min. */
  value: [number, number]
  /** Called whenever either handle moves. */
  onChange: (value: [number, number]) => void
  /** Step increment. Defaults to 1. */
  step?: number
  /** Called to format each endpoint label — defaults to USD currency formatting. */
  formatValue?: (n: number) => string
  /** Optional label above, projected as `[slot=label]` content (or a string input). */
  label?: unknown
  /** Extra classes. */
  className?: string
}
