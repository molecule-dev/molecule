/**
 * Formats a numeric amount as currency via `Intl.NumberFormat`.
 * (Duplicated from `@molecule/app-currency-display-react` so this package
 * stays standalone — or wire the peer dep if you prefer.)
 *
 * @module
 */

/**
 *
 * @param amount
 * @param currency
 * @param locale
 */
export function formatCurrency(amount: number, currency: string = 'USD', locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
