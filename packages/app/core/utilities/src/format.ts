/**
 * Formatting utilities for molecule.dev frontend applications.
 *
 * @module
 */

/** Ordered file size unit labels from bytes to petabytes. */
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

/**
 * Formats a byte count as a human-readable file size string
 * (e.g. `"1.5 MB"`, `"0 B"`, `"-3.2 GB"`).
 *
 * @param bytes - The number of bytes to format (supports negative values).
 * @param decimals - The number of decimal places (default: 2).
 * @returns A formatted file size string with the appropriate unit.
 */
export const getHumanFileSize = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 B'
  if (bytes < 0) return '-' + getHumanFileSize(-bytes, decimals)

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const index = Math.min(i, FILE_SIZE_UNITS.length - 1)

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${FILE_SIZE_UNITS[index]}`
}

/**
 * Formats a number with locale-appropriate thousand separators
 * using `Intl.NumberFormat`.
 *
 * @param value - The number to format.
 * @param locale - The BCP 47 locale string (default: `'en-US'`).
 * @returns The formatted number string (e.g. `"1,234,567"`).
 */
export const formatNumber = (value: number, locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale).format(value)
}

/**
 * Formats a number as a currency string using `Intl.NumberFormat`.
 *
 * @param value - The monetary amount.
 * @param currency - The ISO 4217 currency code (default: `'USD'`).
 * @param locale - The BCP 47 locale string (default: `'en-US'`).
 * @returns The formatted currency string (e.g. `"$1,234.56"`).
 */
export const formatCurrency = (value: number, currency = 'USD', locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value)
}

/**
 * Formats a number as a percentage string using `Intl.NumberFormat`.
 * The input value should be a decimal (e.g. `0.75` for 75%).
 *
 * @param value - The decimal value to format as a percentage.
 * @param decimals - The number of decimal places (default: 0).
 * @param locale - The BCP 47 locale string (default: `'en-US'`).
 * @returns The formatted percentage string (e.g. `"75%"`).
 */
export const formatPercent = (value: number, decimals = 0, locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
