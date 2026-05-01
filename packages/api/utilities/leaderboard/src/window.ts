/**
 * Window resolution helpers.
 *
 * Translates named windows (`daily` / `weekly` / `monthly` / `all-time`)
 * and custom `[start, end)` ranges into a normalized
 * `{ start: Date | null, end: Date | null }` pair where `null` represents
 * an unbounded edge (used by `all-time`).
 *
 * All math is performed in UTC so DST transitions in the host's local
 * zone never shift window boundaries.
 *
 * @module
 */

import type { CustomWindow, LeaderboardWindow } from './types.js'

/**
 * Resolved window — either edge may be `null` for an unbounded side.
 */
export interface ResolvedWindow {
  /** Inclusive lower bound, or `null` for an unbounded start. */
  start: Date | null
  /** Exclusive upper bound, or `null` for an unbounded end. */
  end: Date | null
}

/**
 * Resolve a {@link LeaderboardWindow} to a concrete `[start, end)` pair.
 *
 * Named windows are computed against `now`:
 *  - `daily` — `[start of UTC day, +24h)`.
 *  - `weekly` — `[start of ISO week (Monday 00:00 UTC), +7d)`.
 *  - `monthly` — `[first of UTC month, first of next UTC month)`.
 *  - `all-time` — `{ start: null, end: null }`.
 *
 * Custom windows are returned as-is.
 *
 * @param window - The window descriptor.
 * @param now - Reference instant for named windows. Defaults to `new Date()`.
 * @returns The resolved window.
 */
export function resolveWindow(window: LeaderboardWindow, now: Date = new Date()): ResolvedWindow {
  if (typeof window === 'object' && 'start' in window && 'end' in window) {
    const cw = window as CustomWindow
    if (!(cw.start instanceof Date) || Number.isNaN(cw.start.getTime())) {
      throw new Error('CustomWindow.start must be a valid Date')
    }
    if (!(cw.end instanceof Date) || Number.isNaN(cw.end.getTime())) {
      throw new Error('CustomWindow.end must be a valid Date')
    }
    if (cw.end.getTime() <= cw.start.getTime()) {
      throw new Error('CustomWindow.end must be strictly after start')
    }
    return { start: cw.start, end: cw.end }
  }

  switch (window) {
    case 'daily': {
      const start = startOfUTCDay(now)
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      return { start, end }
    }
    case 'weekly': {
      const start = startOfISOWeekUTC(now)
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
      return { start, end }
    }
    case 'monthly': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
      return { start, end }
    }
    case 'all-time':
      return { start: null, end: null }
    default:
      throw new Error(`Unknown window: ${String(window)}`)
  }
}

/**
 * `true` when `when` falls inside `[resolved.start, resolved.end)`.
 * `null` edges are treated as unbounded.
 *
 * @param when - Event timestamp.
 * @param resolved - Resolved window.
 * @returns `true` if `when` is inside the window.
 */
export function isInWindow(when: Date, resolved: ResolvedWindow): boolean {
  if (resolved.start && when.getTime() < resolved.start.getTime()) return false
  if (resolved.end && when.getTime() >= resolved.end.getTime()) return false
  return true
}

/**
 * Returns midnight (00:00:00.000 UTC) at the start of the given date.
 *
 * @param d - Reference date.
 * @returns The start of the UTC day.
 */
function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * Returns midnight at the start of the ISO week containing `d` —
 * Monday 00:00 UTC.
 *
 * @param d - Reference date.
 * @returns The start of the ISO week in UTC.
 */
function startOfISOWeekUTC(d: Date): Date {
  const day = d.getUTCDay() // 0 = Sun, 1 = Mon, ...
  const isoOffsetFromMon = (day + 6) % 7 // 0 = Mon, ..., 6 = Sun
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - isoOffsetFromMon))
}
