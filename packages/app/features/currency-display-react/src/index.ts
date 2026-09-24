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
 * import { CurrencyDisplay, formatCurrencyCompact } from '@molecule/app-currency-display-react'
 *
 * export function ProductPrice() {
 *   const product = { priceCents: 2999, listPriceCents: 4999, currency: 'USD', revenueCents: 1234500 }
 *   return (
 *     <div>
 *       <CurrencyDisplay
 *         amount={product.priceCents / 100}
 *         originalAmount={product.listPriceCents / 100}
 *         currency={product.currency}
 *         locale="en-US"
 *         size="lg"
 *       />
 *       <small>{formatCurrencyCompact(product.revenueCents / 100, product.currency, 'en-US')}</small>
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Amounts are in MAJOR units (dollars, not cents) — divide stored cents by 100 first, or
 *   `2999` renders as `$2,999.00`.
 * - `currency` defaults to `'USD'` and `locale` to the RUNTIME default — pass `locale`
 *   explicitly (e.g. the i18n provider's current locale) or server and browser may format
 *   differently.
 * - `showSavings` defaults to true, so a `−40%` chip appears whenever `originalAmount > amount`
 *   (the original renders struck-through); pass `showSavings={false}` for plain was/now price
 *   display. `savingsLabel(saved, pct)` (saved in major units, pct a whole number) lets you
 *   localize the chip text.
 * - Formatting is `Intl.NumberFormat` (locale-aware, no i18n keys, no locale bond). It does
 *   NOT convert between currencies. `formatCurrencyCompact` gives `$12.3K` (at most one
 *   decimal); `formatCurrency` gives the full `$12,345.00`.
 * - `getClassMap()` throws unless `setClassMap(classMap)` from `@molecule/app-ui` ran at
 *   startup. No `<I18nProvider>` is required.
 *
 * @module
 */

export * from './CurrencyDisplay.js'
export * from './formatCurrency.js'
