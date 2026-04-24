/**
 * React currency display and formatting utilities.
 *
 * Exports:
 * - `formatCurrency(amount, currency?, locale?)` — plain string via `Intl.NumberFormat`.
 * - `formatCurrencyCompact(amount, currency?, locale?)` — compact notation (`$12.3K`).
 * - `<CurrencyDisplay>` — rendered amount with optional strikethrough original price + savings chip.
 *
 * @module
 */

export * from './CurrencyDisplay.js'
export * from './formatCurrency.js'
