/**
 * Types of `@molecule/app-price-range-slider-vue` — the Vue counterpart of
 * `@molecule/app-price-range-slider-react`, same props and DOM.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link PriceRangeSlider} component. */
export interface PriceRangeSliderProps {
  /** Minimum possible value. */
  min: number
  /** Maximum possible value. */
  max: number
  /** Current [low, high] tuple. If only one value is relevant, set low === min. */
  value: [number, number]
  /** Called whenever either handle moves. Passed as `onChange` or heard as `change`. */
  onChange?: (value: [number, number]) => void
  /** Step increment. Defaults to 1. */
  step?: number
  /** Called to format each endpoint label — defaults to USD currency formatting. */
  formatValue?: (n: number) => string
  /**
   * Optional label above. Passed as a prop or as the same-named slot — both
   * work.
   */
  label?: VNodeChild
  /** Extra classes. */
  className?: string
}
