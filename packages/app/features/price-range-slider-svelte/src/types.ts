/**
 * Types of `@molecule/app-price-range-slider-svelte` — the Svelte counterpart
 * of `@molecule/app-price-range-slider-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link PriceRangeSlider} component. */
export interface PriceRangeSliderProps {
  /** Minimum possible value. */
  min: number
  /** Maximum possible value. */
  max: number
  /** Current [low, high] tuple. If only one value is relevant, set low === min. */
  value: [number, number]
  /** Called whenever either handle moves. */
  onChange?: (value: [number, number]) => void
  /** Step increment. Defaults to 1. */
  step?: number
  /** Called to format each endpoint label — defaults to USD currency formatting. */
  formatValue?: (n: number) => string
  /** Optional label above, as a snippet. */
  label?: Snippet
  /** Extra classes. */
  className?: string
}
