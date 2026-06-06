/**
 * Numeric range slider with two handles.
 *
 * Exports `<PriceRangeSlider>` — dual-handle range slider with formatted labels.
 *
 * @example
 * ```tsx
 * import { PriceRangeSlider } from '@molecule/app-price-range-slider-react'
 *
 * const [range, setRange] = useState<[number, number]>([50, 500])
 *
 * <PriceRangeSlider
 *   min={0}
 *   max={1000}
 *   value={range}
 *   onChange={setRange}
 *   step={10}
 *   label="Price range"
 *   formatValue={(n) => `$${n}`}
 * />
 * ```
 *
 * @module
 */

export * from './PriceRangeSlider.js'
