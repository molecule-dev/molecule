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
 * `validateRule` (called internally by both `nextOccurrence` and
 * `expandOccurrences`) rejects duplicate values within `byDay`,
 * `byMonthDay`, or `byMonth` (e.g. `byDay: ['MO', 'MO']`) — a duplicate
 * would otherwise silently double-emit the same instant and burn
 * `count`/`maxOccurrences` twice per real occurrence.
 *
 * Designed for personal-finance recurring transactions, meeting
 * scheduler, medication reminders, habit trackers, productivity
 * recurring tasks, and other apps that need to project a rule forward
 * without persisting state.
 *
 * @example
 * ```typescript
 * import { expandOccurrences, nextOccurrence, type RecurrenceRule } from '@molecule/api-recurring-schedule'
 *
 * const rule: RecurrenceRule = {
 *   frequency: 'WEEKLY',
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

export * from './browser-guard.js'
export * from './engine.js'
export * from './types.js'
