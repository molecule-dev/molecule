/**
 * Format helpers for the file card. Pure functions — UI-agnostic so they can
 * be unit-tested directly.
 *
 * @module
 */

/**
 * Format a non-negative byte count as a short human-readable string
 * (e.g. `420 B`, `1.4 KB`, `2.3 MB`, `4.7 GB`, `8.1 TB`).
 *
 * Uses a 1024 base (binary) and 1 fractional digit for KB+. Returns the
 * literal string for non-finite or negative inputs so callers do not need to
 * pre-validate. The unit token is intentionally not localized — sizes are
 * universal SI shorthand and translating them would imply different
 * magnitudes.
 *
 * @param value - Byte count (>= 0).
 * @returns Formatted size string.
 */
export function bytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0 B'
  if (value < 1024) return `${Math.round(value)} B`
  const units = ['KB', 'MB', 'GB', 'TB', 'PB']
  let n = value / 1024
  let unitIndex = 0
  while (n >= 1024 && unitIndex < units.length - 1) {
    n /= 1024
    unitIndex += 1
  }
  // 1 decimal place when < 100, else round
  const display = n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, '')
  return `${display} ${units[unitIndex]}`
}

/**
 * A relative-time bucket used to pick a translation key. Higher granularity
 * buckets first; falls through to absolute date when older than ~1 year.
 */
export type RelativeBucket =
  | { kind: 'just-now' }
  | { kind: 'minutes'; n: number }
  | { kind: 'hours'; n: number }
  | { kind: 'days'; n: number }
  | { kind: 'weeks'; n: number }
  | { kind: 'months'; n: number }
  | { kind: 'absolute'; iso: string }

/**
 * Bucket a `Date` (or ISO string / ms timestamp) against `now` into a
 * relative-time bucket. The bucket is purely structural — translation keys
 * and pluralization are applied by the consumer.
 *
 * @param at - Modified-at timestamp (ISO string, ms epoch, or `Date`).
 * @param now - Reference "now" (defaults to `new Date()`). Injected for tests.
 * @returns A `RelativeBucket` describing the offset from `now`.
 */
export function relativeBucket(at: string | number | Date, now: Date = new Date()): RelativeBucket {
  const then = at instanceof Date ? at : new Date(at)
  const ms = now.getTime() - then.getTime()
  if (!Number.isFinite(ms)) return { kind: 'absolute', iso: String(at) }
  if (ms < 60_000) return { kind: 'just-now' }
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day
  if (ms < hour) return { kind: 'minutes', n: Math.floor(ms / minute) }
  if (ms < day) return { kind: 'hours', n: Math.floor(ms / hour) }
  if (ms < week) return { kind: 'days', n: Math.floor(ms / day) }
  if (ms < month) return { kind: 'weeks', n: Math.floor(ms / week) }
  if (ms < year) return { kind: 'months', n: Math.floor(ms / month) }
  return { kind: 'absolute', iso: then.toISOString().slice(0, 10) }
}
