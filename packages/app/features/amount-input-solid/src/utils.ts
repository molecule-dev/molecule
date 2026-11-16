/**
 * Currency formatting for the Solid amount input.
 * (Duplicated from `@molecule/app-currency-display-solid` so this package
 * stays standalone — or wire the peer dep if you prefer.)
 *
 * @module
 */

/**
 * Formats a numeric amount as a localized currency string.
 * @param amount - The amount, in major units.
 * @param currency - The ISO 4217 currency code (default `'USD'`).
 * @param locale - The locale to format for (default: the runtime locale).
 * @returns The formatted currency string.
 */
export function formatCurrency(amount: number, currency: string = 'USD', locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
