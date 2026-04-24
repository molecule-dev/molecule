/**
 * Formats a numeric amount as currency using `Intl.NumberFormat`.
 *
 * @param amount - Amount in major units (e.g. dollars, not cents). Pass `amount / 100` if your stored value is in cents.
 * @param currency - ISO 4217 currency code. Defaults to `"USD"`.
 * @param locale - BCP 47 locale tag. Defaults to the runtime default (`undefined`).
 * @returns Formatted currency string.
 */
export function formatCurrency(amount: number, currency: string = 'USD', locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

/**
 * Formats a numeric amount as currency in a compact form (e.g. "$12.3K").
 * Uses `Intl.NumberFormat` with `notation: 'compact'` when supported.
 * @param amount
 * @param currency
 * @param locale
 */
export function formatCurrencyCompact(
  amount: number,
  currency: string = 'USD',
  locale?: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  } catch {
    return formatCurrency(amount, currency, locale)
  }
}
