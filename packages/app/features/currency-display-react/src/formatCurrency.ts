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
      // minimumFractionDigits is NOT redundant next to the maximum. Without it,
      // ICU versions before ~Node 24 pad compact output to the maximum, so a
      // whole amount rendered as "$99.0" / "$0.0" there and "$99" / "$0" on
      // newer runtimes — a visible difference for anyone on Node 22 or an older
      // browser, and a test that passed locally while failing in CI. Pinning the
      // minimum to 0 makes the output identical across ICU versions ("$12.3K" is
      // unaffected either way). Verified on Node 22.23.2 and 25.9.0.
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount)
  } catch (_error) {
    // `notation: 'compact'` is not supported in all environments (e.g. older Safari / Node).
    // Falling back to the standard formatter is safe and recovers correctly.
    return formatCurrency(amount, currency, locale)
  }
}
