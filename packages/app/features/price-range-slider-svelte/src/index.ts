/**
 * Svelte numeric min/max range picker.
 *
 * Svelte counterpart of `@molecule/app-price-range-slider-react` — the same
 * props (React names) and the same DOM for the same input. Exports
 * `<PriceRangeSlider>` — TWO native `<input type="range">` controls rendered
 * side by side (min slider + max slider) with formatted endpoint labels. The
 * handles clamp against each other so `low <= high` always holds. It is not a
 * single-track dual-thumb slider.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { PriceRangeSlider } from '@molecule/app-price-range-slider-svelte'
 *
 *   let range = $state<[number, number]>([50, 500])
 * </script>
 *
 * <PriceRangeSlider
 *   min={0}
 *   max={1000}
 *   value={range}
 *   onChange={(next) => (range = next)}
 *   step={10}
 *   formatValue={(n) => `$${n}`}
 * >
 *   {#snippet label()}
 *     Price range
 *   {/snippet}
 * </PriceRangeSlider>
 * ```
 *
 * @remarks
 * The default `formatValue` renders US-style dollars (`$1,000`) — always pass
 * your own formatter for non-USD apps. The two sliders' aria-labels
 * ("Minimum"/"Maximum") translate through `t()`
 * (`priceRangeSlider.aria.minimum`/`priceRangeSlider.aria.maximum`), so they
 * follow the active locale. Requires a wired ClassMap bond (`getClassMap()`).
 * The optional `label` is a snippet.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
