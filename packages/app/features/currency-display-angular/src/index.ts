/**
 * Angular currency display and formatting utilities — the counterpart of
 * `@molecule/app-currency-display-react`, with the same props and the same DOM
 * for the same input.
 *
 * Exports:
 * - `formatCurrency(amount, currency?, locale?)` — plain string via `Intl.NumberFormat`.
 * - `formatCurrencyCompact(amount, currency?, locale?)` — compact notation (`$12.3K`).
 * - `CurrencyDisplay` — rendered amount with optional strikethrough original price + savings chip.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { CurrencyDisplay, formatCurrency } from '@molecule/app-currency-display-angular'
 *
 * @Component({
 *   selector: 'app-price',
 *   standalone: true,
 *   imports: [CurrencyDisplay],
 *   template: `
 *     <!-- Basic amount -->
 *     <span mol-currency-display [amount]="49.99" currency="USD" size="lg"></span>
 *
 *     <!-- With original price and savings chip -->
 *     <span mol-currency-display [amount]="29.99" [originalAmount]="49.99" showSavings></span>
 *
 *     <!-- Compact notation: "$29.99K" -->
 *     <span mol-currency-display [amount]="29990" compact size="xl"></span>
 *   `,
 * })
 * export class Price {
 *   // Plain string utility
 *   label = formatCurrency(1234.56, 'EUR', 'de-DE') // "1.234,56 €"
 * }
 * ```
 *
 * @remarks
 * Amounts are in MAJOR units (dollars, not cents) — divide stored cents by
 * 100 first. `showSavings` defaults to true, so a savings chip appears
 * whenever `originalAmount > amount`; pass `[showSavings]="false"` for plain
 * was/now price display. Formatting is `Intl.NumberFormat` (locale-aware,
 * no i18n keys needed); `[savingsLabel]` (a `(saved, pct) => string` function)
 * lets you localize the chip text.
 *
 * @module
 */

export * from './currency-display.component.js'
export * from './formatCurrency.js'
export * from './types.js'
