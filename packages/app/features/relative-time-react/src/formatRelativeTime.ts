/**
 * Formats a date/timestamp as a relative time string ("5 minutes ago",
 * "in 3 days"). Uses the platform `Intl.RelativeTimeFormat` when
 * available, falls back to short-form strings when not.
 *
 * @module
 */

/**
 *
 * @param input
 * @param now
 * @param locale
 */
export function formatRelativeTime(
  input: Date | string | number,
  now: Date | number = Date.now(),
  locale?: string,
): string {
  const then = typeof input === 'number' ? input : input instanceof Date ? +input : +new Date(input)
  const nowMs = typeof now === 'number' ? now : +now
  const diffSec = Math.round((then - nowMs) / 1000)
  const abs = Math.abs(diffSec)
  let unit: Intl.RelativeTimeFormatUnit = 'second'
  let value = diffSec
  if (abs >= 31_536_000) {
    unit = 'year'
    value = Math.round(diffSec / 31_536_000)
  } else if (abs >= 2_592_000) {
    unit = 'month'
    value = Math.round(diffSec / 2_592_000)
  } else if (abs >= 604_800) {
    unit = 'week'
    value = Math.round(diffSec / 604_800)
  } else if (abs >= 86_400) {
    unit = 'day'
    value = Math.round(diffSec / 86_400)
  } else if (abs >= 3_600) {
    unit = 'hour'
    value = Math.round(diffSec / 3_600)
  } else if (abs >= 60) {
    unit = 'minute'
    value = Math.round(diffSec / 60)
  }
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit)
  } catch {
    // Fallback short form
    if (value === 0) return 'just now'
    const past = value < 0
    const n = Math.abs(value)
    const u = unit === 'second' ? 's' : unit[0]
    return past ? `${n}${u} ago` : `in ${n}${u}`
  }
}
