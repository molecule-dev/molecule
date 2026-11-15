/**
 * Vue numeric min/max range picker.
 *
 * Vue counterpart of `@molecule/app-price-range-slider-react` — the same
 * props (React names) and the same DOM for the same input. Exports
 * `<PriceRangeSlider>` — TWO native `<input type="range">` controls rendered
 * side by side (min slider + max slider) with formatted endpoint labels. The
 * handles clamp against each other so `low <= high` always holds. It is not a
 * single-track dual-thumb slider.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { PriceRangeSlider } from '@molecule/app-price-range-slider-vue'
 *
 * const PriceFilter = defineComponent({
 *   setup() {
 *     const range = ref<[number, number]>([50, 500])
 *     return () =>
 *       h(PriceRangeSlider, {
 *         min: 0,
 *         max: 1000,
 *         value: range.value,
 *         onChange: (next: [number, number]) => (range.value = next),
 *         step: 10,
 *         label: 'Price range',
 *         formatValue: (n: number) => `$${n}`,
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * The default `formatValue` renders US-style dollars (`$1,000`) — always pass
 * your own formatter for non-USD apps. The two sliders carry fixed English
 * aria-labels ("Minimum"/"Maximum"); there is no locale bond. Requires a
 * wired ClassMap bond (`getClassMap()`). The optional `label` arrives as a
 * prop or as the same-named slot; `onChange` is heard as the `change` event.
 *
 * @module
 */

export * from './PriceRangeSlider.js'
export * from './types.js'
