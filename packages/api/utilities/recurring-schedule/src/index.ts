/**
 * RRULE-style schedule engine for molecule.dev.
 *
 * Pure-function next-occurrence and expand-occurrences-in-window helpers
 * for recurring events: daily/weekly/monthly/yearly with `interval`,
 * `byDay` (weekday filter), `byMonthDay` (incl. negative = "from end"),
 * `byMonth`, and termination via `count` or `until`.
 *
 * All math is performed in UTC so DST transitions in the host's local
 * zone never shift occurrences by an hour. Wall-clock-of-day from the
 * seed `startDate` is preserved across every emitted occurrence.
 *
 * Designed for personal-finance recurring transactions, meeting
 * scheduler, medication reminders, habit trackers, productivity
 * recurring tasks, and other apps that need to project a rule forward
 * without persisting state.
 *
 * @example
 * ```typescript
 * import { expandOccurrences, nextOccurrence } from '@molecule/api-recurring-schedule'
 *
 * const rule = {
 *   frequency: 'WEEKLY' as const,
 *   startDate: '2026-01-05T09:00:00.000Z', // a Monday
 *   byDay: ['MO', 'WE', 'FR'],
 *   count: 6,
 * }
 *
 * nextOccurrence(rule, '2026-01-06T00:00:00.000Z')
 * // → '2026-01-07T09:00:00.000Z' (Wednesday)
 *
 * expandOccurrences(rule, {
 *   start: '2026-01-01T00:00:00.000Z',
 *   end: '2026-02-01T00:00:00.000Z',
 * })
 * // → six ISO strings: Mon/Wed/Fri across two weeks
 * ```
 *
 * @module
 */

export * from './engine.js'
export * from './types.js'
