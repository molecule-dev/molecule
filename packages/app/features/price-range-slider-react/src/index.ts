/**
 * Numeric min/max range picker.
 *
 * Exports `<PriceRangeSlider>` — TWO native `<input type="range">` controls
 * rendered side by side (min slider + max slider) with formatted endpoint
 * labels. The handles clamp against each other so `low <= high` always
 * holds. It is not a single-track dual-thumb slider.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { PriceRangeSlider } from '@molecule/app-price-range-slider-react'
 *
 * function PriceFilter() {
 *   const [range, setRange] = useState<[number, number]>([50, 500])
 *   return (
 *     <PriceRangeSlider
 *       min={0}
 *       max={1000}
 *       value={range}
 *       onChange={setRange}
 *       step={10}
 *       label="Price range"
 *       formatValue={(n) => `$${n}`}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * The default `formatValue` renders US-style dollars (`$1,000`) — always pass
 * your own formatter for non-USD apps. The two sliders' aria-labels
 * ("Minimum"/"Maximum") translate through `t()`
 * (`priceRangeSlider.aria.minimum`/`priceRangeSlider.aria.maximum`), so they
 * follow the active locale. Requires a wired ClassMap bond (`getClassMap()`).
 *
 * @module
 */

export * from './PriceRangeSlider.js'
