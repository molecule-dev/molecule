/**
 * React currency display and formatting utilities.
 *
 * Exports:
 * - `formatCurrency(amount, currency?, locale?)` — plain string via `Intl.NumberFormat`.
 * - `formatCurrencyCompact(amount, currency?, locale?)` — compact notation (`$12.3K`).
 * - `<CurrencyDisplay>` — rendered amount with optional strikethrough original price + savings chip.
 *
 * @example
 * ```tsx
 * import { CurrencyDisplay, formatCurrency } from '@molecule/app-currency-display-react'
 *
 * // Basic amount
 * <CurrencyDisplay amount={49.99} currency="USD" size="lg" />
 *
 * // With original price and savings chip
 * <CurrencyDisplay amount={29.99} originalAmount={49.99} currency="USD" showSavings />
 *
 * // Compact notation: "$29.99K"
 * <CurrencyDisplay amount={29990} currency="USD" compact size="xl" />
 *
 * // Plain string utility
 * const label = formatCurrency(1234.56, 'EUR', 'de-DE') // "1.234,56 €"
 * ```
 *
 * @module
 */

export * from './CurrencyDisplay.js'
export * from './formatCurrency.js'
