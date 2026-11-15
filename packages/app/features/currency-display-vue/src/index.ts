/**
 * Vue currency display and formatting utilities.
 *
 * Exports:
 * - `formatCurrency(amount, currency?, locale?)` — plain string via `Intl.NumberFormat`.
 * - `formatCurrencyCompact(amount, currency?, locale?)` — compact notation (`$12.3K`).
 * - `<CurrencyDisplay>` — rendered amount with optional strikethrough original price + savings chip.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { CurrencyDisplay, formatCurrency } from '@molecule/app-currency-display-vue'
 *
 * const Price = defineComponent({
 *   setup() {
 *     // Basic amount
 *     return () => h(CurrencyDisplay, { amount: 49.99, currency: 'USD', size: 'lg' })
 *   },
 * })
 *
 * // With original price and savings chip
 * h(CurrencyDisplay, { amount: 29.99, originalAmount: 49.99, currency: 'USD', showSavings: true })
 *
 * // Compact notation: "$29.99K"
 * h(CurrencyDisplay, { amount: 29990, currency: 'USD', compact: true, size: 'xl' })
 *
 * // Plain string utility
 * const label = formatCurrency(1234.56, 'EUR', 'de-DE') // "1.234,56 €"
 * ```
 *
 * @remarks
 * Amounts are in MAJOR units (dollars, not cents) — divide stored cents by
 * 100 first. `showSavings` defaults to true, so a savings chip appears
 * whenever `originalAmount > amount`; pass `showSavings: false` for plain
 * was/now price display. Formatting is `Intl.NumberFormat` (locale-aware,
 * no i18n keys needed); `savingsLabel(saved, pct)` lets you localize the
 * chip text.
 *
 * @module
 */

export * from './CurrencyDisplay.js'
export * from './formatCurrency.js'
export * from './types.js'
