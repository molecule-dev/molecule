/**
 * Type definitions for the recurring-schedule engine.
 *
 * @module
 */

/**
 * RRULE frequency. Maps to the iCalendar RFC 5545 FREQ values.
 */
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

/**
 * Day-of-week codes used by `byDay`. Two-letter iCalendar codes:
 * MO=Mon, TU=Tue, WE=Wed, TH=Thu, FR=Fri, SA=Sat, SU=Sun.
 */
export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

/**
 * A recurrence rule describing a repeating event.
 *
 * Modeled after iCalendar RRULE (RFC 5545) but simplified to the subset
 * needed by personal-finance, meeting-scheduler, medication-reminder,
 * habit-tracker, and productivity recurring-task apps.
 */
export interface RecurrenceRule {
  /** Repetition frequency. */
  frequency: Frequency

  /** ISO 8601 date-time string (UTC or with offset) — the seed occurrence. */
  startDate: string

  /**
   * Repeat every `interval` units of `frequency`. Default: 1.
   * e.g. frequency=WEEKLY, interval=2 ⇒ every two weeks.
   */
  interval?: number

  /**
   * For WEEKLY: which days of the week. e.g. `['MO','WE','FR']`.
   * For MONTHLY/YEARLY: positive nth-of-month not yet supported here;
   * combine with `byMonthDay` for nth-day-of-month.
   * Ignored for DAILY.
   */
  byDay?: Weekday[]

  /**
   * For MONTHLY/YEARLY: day-of-month numbers (1..31). Negative values
   * count from the end of the month (-1 = last day). Out-of-range days
   * for shorter months are skipped (e.g. `byMonthDay: [31]` skips Feb).
   */
  byMonthDay?: number[]

  /**
   * For YEARLY: month numbers (1..12). When omitted, the start date's
   * month is used.
   */
  byMonth?: number[]

  /**
   * Maximum total occurrences (counting `startDate` as occurrence #1).
   * When omitted, the rule is unbounded (or bounded only by `until`).
   */
  count?: number

  /**
   * Inclusive upper bound. ISO 8601 string. When set, no occurrence is
   * generated after this instant.
   */
  until?: string
}

/**
 * A half-open `[start, end)` window of ISO 8601 date-time strings used by
 * `expandOccurrences`.
 */
export interface OccurrenceWindow {
  /** Inclusive lower bound (ISO 8601). */
  start: string
  /** Exclusive upper bound (ISO 8601). */
  end: string
}

/**
 * Options passed to occurrence generators.
 */
export interface OccurrenceOptions {
  /**
   * Hard cap on the number of occurrences *returned* by
   * `expandOccurrences`. Occurrences skipped while advancing from the
   * rule's seed to the requested window/lower bound do NOT count against
   * it, so an old-but-unbounded rule stays answerable years after its
   * `startDate`. `nextOccurrence` returns at most one occurrence and is
   * only short-circuited by a value below 1. Runaway rules are defended
   * separately by an internal hard iteration ceiling. Default: 1000.
   */
  maxOccurrences?: number
}
