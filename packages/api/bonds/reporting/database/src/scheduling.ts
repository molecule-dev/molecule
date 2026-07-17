/**
 * Cron matching + due-ness for persisted report schedules.
 *
 * The database reporting bond stores a cron string per schedule but does not
 * itself own scheduling — {@link DatabaseReportProvider.runDueReports} calls
 * {@link isScheduleDue} on a cadence to decide which stored schedules to
 * generate + deliver. These are pure functions with no I/O so they are cheap to
 * unit test.
 *
 * The built-in matcher handles standard 5-field numeric cron expressions
 * (`minute hour day-of-month month day-of-week`) with `*`, lists (`,`), ranges
 * (`a-b`), and a `/N` step suffix on any of those. Day-of-week is `0`–`6` with
 * `0`/`7` = Sunday. Fields are evaluated in **UTC**. Named months/weekdays
 * (`JAN`, `MON`) and per-schedule timezones are out of scope — inject a custom
 * `isDue` predicate (see {@link RunDueReportsOptions}) for those.
 *
 * @module
 */

import type { StoredSchedule } from './types.js'

/**
 * Parses a single cron field into the concrete set of values it matches within
 * `[lo, hi]`. Supports `*`, `a`, `a-b`, and any of those with a `/step` suffix,
 * plus comma-separated lists of them.
 *
 * @param field - The raw cron field text (e.g. `'1-5'`, `'0,30'`, `'0-20/5'`).
 * @param lo - Lowest legal value for this field.
 * @param hi - Highest legal value for this field.
 * @returns The set of matching integer values.
 * @throws {Error} When the field is not valid cron syntax.
 */
export const parseCronField = (field: string, lo: number, hi: number): Set<number> => {
  const out = new Set<number>()

  for (const part of field.split(',')) {
    const [rangeText, stepText] = part.split('/')

    let step = 1
    if (stepText !== undefined) {
      step = Number(stepText)
      if (!Number.isInteger(step) || step <= 0) {
        throw new Error(`Invalid cron step in field ${JSON.stringify(field)}`)
      }
    }

    let start: number
    let end: number
    if (rangeText === '*' || rangeText === '') {
      start = lo
      end = hi
    } else if (rangeText.includes('-')) {
      const [a, b] = rangeText.split('-')
      start = Number(a)
      end = Number(b)
    } else {
      start = Number(rangeText)
      // A bare value with a step (e.g. `5/10`) means "from 5 to the max, every step".
      end = stepText !== undefined ? hi : start
    }

    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      throw new Error(`Invalid cron field ${JSON.stringify(field)}`)
    }

    for (let value = start; value <= end; value += step) {
      if (value >= lo && value <= hi) out.add(value)
    }
  }

  return out
}

/**
 * Tests whether a day-of-week value matches a cron day-of-week field, treating
 * both `0` and `7` as Sunday.
 *
 * @param field - The raw day-of-week cron field.
 * @param day - The JS `getUTCDay()` value (`0` = Sunday … `6` = Saturday).
 * @returns `true` if the day matches the field.
 */
const dayOfWeekMatches = (field: string, day: number): boolean => {
  const matches = parseCronField(field, 0, 7)
  return matches.has(day) || (day === 0 && matches.has(7))
}

/**
 * Tests whether a cron expression matches the given instant (evaluated in UTC).
 *
 * Follows the standard Vixie-cron day rule: when BOTH day-of-month and
 * day-of-week are restricted (neither is `*`), a match on EITHER is sufficient;
 * otherwise the restricted field(s) must match.
 *
 * @param expr - A 5-field cron expression.
 * @param date - The instant to test.
 * @returns `true` if `expr` fires at `date`.
 * @throws {Error} When `expr` does not have exactly 5 fields or a field is malformed.
 */
export const cronMatches = (expr: string, date: Date): boolean => {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) {
    throw new Error(`Unsupported cron expression (expected 5 fields): ${JSON.stringify(expr)}`)
  }

  const [minute, hour, dom, month, dow] = fields

  const minuteMatch = parseCronField(minute, 0, 59).has(date.getUTCMinutes())
  const hourMatch = parseCronField(hour, 0, 23).has(date.getUTCHours())
  const monthMatch = parseCronField(month, 1, 12).has(date.getUTCMonth() + 1)

  const domRestricted = dom !== '*'
  const dowRestricted = dow !== '*'
  const domMatch = parseCronField(dom, 1, 31).has(date.getUTCDate())
  const dowMatch = dayOfWeekMatches(dow, date.getUTCDay())

  let dayMatch: boolean
  if (domRestricted && dowRestricted) {
    dayMatch = domMatch || dowMatch
  } else if (domRestricted) {
    dayMatch = domMatch
  } else if (dowRestricted) {
    dayMatch = dowMatch
  } else {
    dayMatch = true
  }

  return minuteMatch && hourMatch && monthMatch && dayMatch
}

/**
 * Whether two instants fall in the same UTC minute.
 *
 * @param a - First instant.
 * @param b - Second instant.
 * @returns `true` if both share the same minute bucket.
 */
const sameUtcMinute = (a: Date, b: Date): boolean => {
  return Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000)
}

/**
 * Default due-ness predicate for {@link DatabaseReportProvider.runDueReports}: a
 * schedule is due when its cron matches `now`'s UTC minute AND it has not
 * already run during that same minute (guards against a runner invoked more
 * than once per minute double-delivering).
 *
 * @param schedule - The stored schedule.
 * @param now - The instant to evaluate against.
 * @returns `true` if the schedule should run now.
 */
export const isScheduleDue = (schedule: StoredSchedule, now: Date): boolean => {
  if (!cronMatches(schedule.schedule, now)) return false

  if (schedule.lastRunAt) {
    const last = new Date(schedule.lastRunAt)
    if (!Number.isNaN(last.getTime()) && sameUtcMinute(last, now)) return false
  }

  return true
}
