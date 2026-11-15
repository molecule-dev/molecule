/**
 * Angular numeric min/max range picker — the Angular counterpart of
 * `@molecule/app-price-range-slider-react`: the same props and the same DOM
 * for the same input.
 *
 * Exports `<PriceRangeSlider>` — TWO native `<input type="range">` controls
 * rendered side by side (min slider + max slider) with formatted endpoint
 * labels. The handles clamp against each other so `low <= high` always holds.
 * It is not a single-track dual-thumb slider.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { PriceRangeSlider } from '@molecule/app-price-range-slider-angular'
 *
 * @Component({
 *   selector: 'price-filter',
 *   standalone: true,
 *   imports: [PriceRangeSlider],
 *   template: `
 *     <div
 *       mol-price-range-slider
 *       [min]="0"
 *       [max]="1000"
 *       [value]="[50, 500]"
 *       [step]="10"
 *       [onChange]="setRange"
 *     >
 *       <strong slot="label">Price range</strong>
 *     </div>
 *   `,
 * })
 * export class PriceFilter {}
 * ```
 *
 * @remarks
 * The default `formatValue` renders US-style dollars (`$1,000`) — always pass
 * your own formatter for non-USD apps. The two sliders carry fixed English
 * aria-labels ("Minimum"/"Maximum"); there is no locale bond. Requires a
 * wired ClassMap bond (`getClassMap()`). The optional `label` is projected
 * `[slot=label]` content (or a string `label` input).
 *
 * @module
 */

export * from './price-range-slider.component.js'
export * from './types.js'
