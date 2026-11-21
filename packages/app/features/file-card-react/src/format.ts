/**
 * Format helpers for the file card. Pure functions — UI-agnostic so they can
 * be unit-tested directly.
 *
 * @module
 */

/** The unit token a formatted byte count ends in (`B` plus the binary steps). */
export type SizeUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB'

/** A formatted size's displayed number and its unit token, split for `t()`. */
export interface SizeParts {
  /** The displayed number, rounded the way {@link bytes} displays it. */
  n: string
  /** The unit token the number counts. */
  unit: SizeUnit
}

/**
 * Split a non-negative byte count into its displayed number and unit token
 * (e.g. `420` + `B`, `1.4` + `KB`, `471` + `MB`) — the two halves
 * {@link bytes} joins, exposed so the card can translate the unit word via
 * `t()` (one literal key per {@link SizeUnit}, as the kind labels do).
 *
 * Uses a 1024 base (binary) and 1 fractional digit for KB+. Returns the
 * `0 B` parts for non-finite or negative inputs so callers do not need to
 * pre-validate.
 *
 * @param value - Byte count (>= 0).
 * @returns The displayed number and unit token.
 */
export function sizeParts(value: number): SizeParts {
  if (!Number.isFinite(value) || value < 0) return { n: '0', unit: 'B' }
  if (value < 1024) return { n: String(Math.round(value)), unit: 'B' }
  const units: SizeUnit[] = ['KB', 'MB', 'GB', 'TB', 'PB']
  let n = value / 1024
  let unitIndex = 0
  while (n >= 1024 && unitIndex < units.length - 1) {
    n /= 1024
    unitIndex += 1
  }
  // 1 decimal place when < 100, else round
  const display = n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, '')
  return { n: display, unit: units[unitIndex] as SizeUnit }
}

/**
 * Format a non-negative byte count as a short human-readable string
 * (e.g. `420 B`, `1.4 KB`, `2.3 MB`, `4.7 GB`, `8.1 TB`).
 *
 * The unlocalized join of {@link sizeParts}'s two halves, for callers that
 * want the raw SI shorthand. The card itself renders the unit through `t()`
 * (`file-card.size.<unit>` keys in the locale bond) so a locale switch
 * translates it; the unit token is universal SI shorthand — a language that
 * names bytes differently (French octets, Russian КБ) changes only the token,
 * never the magnitude.
 *
 * @param value - Byte count (>= 0).
 * @returns Formatted size string.
 */
export function bytes(value: number): string {
  const { n, unit } = sizeParts(value)
  return `${n} ${unit}`
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
