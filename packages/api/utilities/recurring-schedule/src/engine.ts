/**
 * Pure RRULE-style schedule engine.
 *
 * All date math operates in UTC to avoid DST/time-zone surprises:
 * the seed `startDate` is parsed once into a `Date`, and every
 * subsequent occurrence is computed by stepping UTC fields. Callers
 * who want to interpret occurrences in a particular zone should do so
 * at the boundary (e.g. when rendering or storing).
 *
 * Pure functions — no I/O, no global state, no DB.
 *
 * @module
 */

import type {
  Frequency,
  OccurrenceOptions,
  OccurrenceWindow,
  RecurrenceRule,
  Weekday,
} from './types.js'

const WEEKDAY_INDEX: Record<Weekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

const DEFAULT_MAX_OCCURRENCES = 1000

/**
 * Validates a recurrence rule. Throws `Error` on malformed rules.
 *
 * @param rule - The rule to validate.
 */
export function validateRule(rule: RecurrenceRule): void {
  if (!rule || typeof rule !== 'object') {
    throw new Error('RecurrenceRule must be an object')
  }
  if (!isValidFrequency(rule.frequency)) {
    throw new Error(`Invalid frequency: ${String(rule.frequency)}`)
  }
  if (typeof rule.startDate !== 'string' || Number.isNaN(Date.parse(rule.startDate))) {
    throw new Error(`Invalid startDate: ${String(rule.startDate)}`)
  }
  if (rule.interval !== undefined) {
    if (!Number.isInteger(rule.interval) || rule.interval < 1) {
      throw new Error(`interval must be a positive integer, got ${rule.interval}`)
    }
  }
  if (rule.count !== undefined) {
    if (!Number.isInteger(rule.count) || rule.count < 1) {
      throw new Error(`count must be a positive integer, got ${rule.count}`)
    }
  }
  if (rule.until !== undefined && Number.isNaN(Date.parse(rule.until))) {
    throw new Error(`Invalid until: ${rule.until}`)
  }
  if (rule.byDay) {
    for (const d of rule.byDay) {
      if (!(d in WEEKDAY_INDEX)) {
        throw new Error(`Invalid byDay: ${d}`)
      }
    }
  }
  if (rule.byMonthDay) {
    for (const d of rule.byMonthDay) {
      if (!Number.isInteger(d) || d === 0 || d < -31 || d > 31) {
        throw new Error(`Invalid byMonthDay value: ${d}`)
      }
    }
  }
  if (rule.byMonth) {
    for (const m of rule.byMonth) {
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        throw new Error(`Invalid byMonth value: ${m}`)
      }
    }
  }
}

/**
 * Returns true if `value` is one of the four supported frequency strings.
 */
function isValidFrequency(value: unknown): value is Frequency {
  return value === 'DAILY' || value === 'WEEKLY' || value === 'MONTHLY' || value === 'YEARLY'
}

/**
 * Returns the next occurrence at or after `after`, or `null` if the rule
 * has terminated (via `count`/`until`) before then.
 *
 * The seed `startDate` itself counts as the first occurrence.
 *
 * @param rule - The recurrence rule.
 * @param after - Lower bound (inclusive) as ISO string or `Date`.
 *                When omitted, defaults to the rule's `startDate`.
 * @param options - Optional generator caps.
 * @returns ISO 8601 date-time string of the next occurrence, or `null`.
 */
export function nextOccurrence(
  rule: RecurrenceRule,
  after?: string | Date,
  options: OccurrenceOptions = {},
): string | null {
  validateRule(rule)
  const lowerBound = after === undefined ? new Date(rule.startDate) : toDate(after)
  const lowerMs = lowerBound.getTime()

  const max = options.maxOccurrences ?? DEFAULT_MAX_OCCURRENCES
  let i = 0
  for (const occurrence of iterateOccurrences(rule)) {
    if (++i > max) return null
    if (occurrence.getTime() >= lowerMs) {
      return occurrence.toISOString()
    }
  }
  return null
}

/**
 * Expands a rule into all occurrences that fall inside the half-open
 * window `[window.start, window.end)`.
 *
 * @param rule - The recurrence rule.
 * @param window - Inclusive-start, exclusive-end ISO date-time bounds.
 * @param options - Optional generator caps.
 * @returns Array of ISO 8601 date-time strings (chronological).
 */
export function expandOccurrences(
  rule: RecurrenceRule,
  window: OccurrenceWindow,
  options: OccurrenceOptions = {},
): string[] {
  validateRule(rule)
  if (Number.isNaN(Date.parse(window.start)) || Number.isNaN(Date.parse(window.end))) {
    throw new Error('OccurrenceWindow.start and end must be valid ISO date strings')
  }

  const startMs = Date.parse(window.start)
  const endMs = Date.parse(window.end)
  if (endMs <= startMs) return []

  const max = options.maxOccurrences ?? DEFAULT_MAX_OCCURRENCES
  const out: string[] = []
  let i = 0
  for (const occurrence of iterateOccurrences(rule)) {
    if (++i > max) break
    const ms = occurrence.getTime()
    if (ms >= endMs) break
    if (ms >= startMs) out.push(occurrence.toISOString())
  }
  return out
}

/**
 * Internal generator yielding `Date` objects for each occurrence in
 * order, terminating on `count` / `until` / a hard 100k iteration ceiling
 * (in case a malformed rule somehow slipped past validation).
 *
 * @yields {Date} Each occurrence date in chronological order.
 */
function* iterateOccurrences(rule: RecurrenceRule): Generator<Date> {
  const seed = new Date(rule.startDate)
  const interval = rule.interval ?? 1
  const count = rule.count
  const untilMs = rule.until === undefined ? Infinity : Date.parse(rule.until)

  let yielded = 0
  const HARD_CEILING = 100_000

  switch (rule.frequency) {
    case 'DAILY':
      for (let i = 0; i < HARD_CEILING; i++) {
        const d = addUTCDays(seed, i * interval)
        if (d.getTime() > untilMs) return
        yield d
        yielded++
        if (count !== undefined && yielded >= count) return
      }
      return

    case 'WEEKLY': {
      // Within each 7-day "week step", emit the days listed in byDay
      // (default = the seed's weekday) in chronological order.
      const days = (
        rule.byDay && rule.byDay.length > 0 ? rule.byDay : [weekdayCode(seed)]
      ) as Weekday[]
      // Anchor at the start of the seed's UTC week (Monday ISO-style)
      // so that interval > 1 advances by full week-blocks consistently.
      const weekAnchor = startOfISOWeekUTC(seed)
      const seedMs = seed.getTime()
      const offsets = days.map((d) => isoOffsetFromMonday(d)).sort((a, b) => a - b)

      for (let block = 0; block < HARD_CEILING; block++) {
        const blockStart = addUTCDays(weekAnchor, block * interval * 7)
        for (const offset of offsets) {
          const d = withClockFrom(addUTCDays(blockStart, offset), seed)
          // Skip occurrences earlier than the seed itself.
          if (d.getTime() < seedMs) continue
          if (d.getTime() > untilMs) return
          yield d
          yielded++
          if (count !== undefined && yielded >= count) return
        }
      }
      return
    }

    case 'MONTHLY': {
      // Pull the seed's day-of-month if no byMonthDay supplied.
      const days =
        rule.byMonthDay && rule.byMonthDay.length > 0 ? [...rule.byMonthDay] : [seed.getUTCDate()]

      const seedMs = seed.getTime()
      const seedYear = seed.getUTCFullYear()
      const seedMonth = seed.getUTCMonth()

      for (let block = 0; block < HARD_CEILING; block++) {
        const monthIdx = seedMonth + block * interval
        const year = seedYear + Math.floor(monthIdx / 12)
        const month = ((monthIdx % 12) + 12) % 12

        const dayValues: number[] = []
        for (const d of days) {
          const resolved = resolveMonthDay(year, month, d)
          if (resolved !== null) dayValues.push(resolved)
        }
        dayValues.sort((a, b) => a - b)

        for (const day of dayValues) {
          const occurrence = withClockFrom(new Date(Date.UTC(year, month, day)), seed)
          if (occurrence.getTime() < seedMs) continue
          if (occurrence.getTime() > untilMs) return
          if (rule.byDay && rule.byDay.length > 0) {
            // Optional weekday filter
            if (!rule.byDay.includes(weekdayCode(occurrence))) continue
          }
          yield occurrence
          yielded++
          if (count !== undefined && yielded >= count) return
        }
      }
      return
    }

    case 'YEARLY': {
      const seedMs = seed.getTime()
      const seedYear = seed.getUTCFullYear()
      const seedMonth = seed.getUTCMonth()
      const seedDay = seed.getUTCDate()

      const months =
        rule.byMonth && rule.byMonth.length > 0
          ? rule.byMonth.map((m) => m - 1).sort((a, b) => a - b)
          : [seedMonth]

      const days = rule.byMonthDay && rule.byMonthDay.length > 0 ? [...rule.byMonthDay] : [seedDay]

      for (let block = 0; block < HARD_CEILING; block++) {
        const year = seedYear + block * interval

        const candidates: Date[] = []
        for (const month of months) {
          for (const d of days) {
            const resolved = resolveMonthDay(year, month, d)
            if (resolved === null) continue
            const candidate = withClockFrom(new Date(Date.UTC(year, month, resolved)), seed)
            if (candidate.getTime() < seedMs) continue
            if (rule.byDay && rule.byDay.length > 0) {
              if (!rule.byDay.includes(weekdayCode(candidate))) continue
            }
            candidates.push(candidate)
          }
        }
        candidates.sort((a, b) => a.getTime() - b.getTime())

        for (const occurrence of candidates) {
          if (occurrence.getTime() > untilMs) return
          yield occurrence
          yielded++
          if (count !== undefined && yielded >= count) return
        }
      }
      return
    }
  }
}

/**
 * Add `days` whole days to a `Date` using UTC arithmetic so we don't
 * accidentally cross a DST boundary in the host's local zone.
 */
function addUTCDays(d: Date, days: number): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + days,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  )
}

/**
 * Returns midnight at the start of the ISO week (Monday, 00:00 UTC) for
 * the given date.
 */
function startOfISOWeekUTC(d: Date): Date {
  const day = d.getUTCDay() // 0 = Sun, 1 = Mon, ...
  const isoOffsetFromMon = (day + 6) % 7 // 0 = Mon, 1 = Tue, ..., 6 = Sun
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - isoOffsetFromMon))
}

/**
 * Position within an ISO week (Mon=0..Sun=6) for a Weekday code.
 */
function isoOffsetFromMonday(w: Weekday): number {
  // ISO week order: Mon, Tue, Wed, Thu, Fri, Sat, Sun
  const order: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  return order.indexOf(w)
}

/**
 * Returns the Weekday code for a Date (UTC).
 */
function weekdayCode(d: Date): Weekday {
  const codes: Weekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
  return codes[d.getUTCDay()] as Weekday
}

/**
 * Returns a copy of `d` with the time-of-day fields replaced by those
 * of `clockSrc` (UTC). Used so weekly/monthly/yearly occurrences keep
 * the seed's wall-clock time across DST transitions.
 */
function withClockFrom(d: Date, clockSrc: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      clockSrc.getUTCHours(),
      clockSrc.getUTCMinutes(),
      clockSrc.getUTCSeconds(),
      clockSrc.getUTCMilliseconds(),
    ),
  )
}

/**
 * Resolve a (possibly negative or out-of-range) byMonthDay value against
 * a real (year, month). Returns the actual day number, or `null` if
 * the day doesn't exist in that month (e.g. `31` in February).
 *
 * `month` is 0-indexed.
 */
function resolveMonthDay(year: number, month: number, day: number): number | null {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  let resolved: number
  if (day > 0) {
    resolved = day
  } else {
    // -1 = last day, -2 = second-to-last, ...
    resolved = lastDay + day + 1
  }
  if (resolved < 1 || resolved > lastDay) return null
  return resolved
}

/**
 * Coerces a string or `Date` value into a `Date` object.
 */
function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d)
}
