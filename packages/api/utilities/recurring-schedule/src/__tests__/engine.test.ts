/**
 * Unit tests for `@molecule/api-recurring-schedule`.
 *
 * Covers:
 * - DAILY / WEEKLY / MONTHLY / YEARLY frequencies
 * - `interval` (every N days/weeks/months/years)
 * - `byDay` (weekly weekday filter)
 * - `byMonthDay` (incl. negative "from-end" values, skipping invalid days)
 * - `byMonth` (yearly month filter)
 * - termination via `count` and `until`
 * - DST edge cases (hour preservation across spring-forward / fall-back)
 * - rule validation
 * - `nextOccurrence` lower-bound semantics
 * - `expandOccurrences` half-open window semantics
 */

import { describe, expect, it } from 'vitest'

import { expandOccurrences, nextOccurrence, validateRule } from '../engine.js'
import type { RecurrenceRule } from '../types.js'

describe('@molecule/api-recurring-schedule', () => {
  describe('validateRule', () => {
    it('accepts a minimal valid rule', () => {
      expect(() =>
        validateRule({ frequency: 'DAILY', startDate: '2026-01-01T00:00:00.000Z' }),
      ).not.toThrow()
    })

    it('rejects an unknown frequency', () => {
      expect(() =>
        validateRule({
          frequency: 'HOURLY' as unknown as 'DAILY',
          startDate: '2026-01-01T00:00:00.000Z',
        }),
      ).toThrow(/Invalid frequency/)
    })

    it('rejects an invalid startDate', () => {
      expect(() => validateRule({ frequency: 'DAILY', startDate: 'not-a-date' })).toThrow(
        /Invalid startDate/,
      )
    })

    it('rejects non-positive interval', () => {
      expect(() =>
        validateRule({
          frequency: 'DAILY',
          startDate: '2026-01-01T00:00:00.000Z',
          interval: 0,
        }),
      ).toThrow(/interval/)
      expect(() =>
        validateRule({
          frequency: 'DAILY',
          startDate: '2026-01-01T00:00:00.000Z',
          interval: -1,
        }),
      ).toThrow(/interval/)
    })

    it('rejects non-positive count', () => {
      expect(() =>
        validateRule({
          frequency: 'DAILY',
          startDate: '2026-01-01T00:00:00.000Z',
          count: 0,
        }),
      ).toThrow(/count/)
    })

    it('rejects malformed until', () => {
      expect(() =>
        validateRule({
          frequency: 'DAILY',
          startDate: '2026-01-01T00:00:00.000Z',
          until: 'tomorrow',
        }),
      ).toThrow(/until/)
    })

    it('rejects bad byDay codes', () => {
      expect(() =>
        validateRule({
          frequency: 'WEEKLY',
          startDate: '2026-01-01T00:00:00.000Z',
          byDay: ['XX' as unknown as 'MO'],
        }),
      ).toThrow(/byDay/)
    })

    it('rejects bad byMonthDay values', () => {
      expect(() =>
        validateRule({
          frequency: 'MONTHLY',
          startDate: '2026-01-01T00:00:00.000Z',
          byMonthDay: [0],
        }),
      ).toThrow(/byMonthDay/)
      expect(() =>
        validateRule({
          frequency: 'MONTHLY',
          startDate: '2026-01-01T00:00:00.000Z',
          byMonthDay: [32],
        }),
      ).toThrow(/byMonthDay/)
    })

    it('rejects bad byMonth values', () => {
      expect(() =>
        validateRule({
          frequency: 'YEARLY',
          startDate: '2026-01-01T00:00:00.000Z',
          byMonth: [13],
        }),
      ).toThrow(/byMonth/)
    })
  })

  describe('DAILY', () => {
    const rule: RecurrenceRule = {
      frequency: 'DAILY',
      startDate: '2026-01-01T08:00:00.000Z',
      count: 5,
    }

    it('expands every day starting from the seed', () => {
      const occurrences = expandOccurrences(rule, {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-02-01T00:00:00.000Z',
      })
      expect(occurrences).toEqual([
        '2026-01-01T08:00:00.000Z',
        '2026-01-02T08:00:00.000Z',
        '2026-01-03T08:00:00.000Z',
        '2026-01-04T08:00:00.000Z',
        '2026-01-05T08:00:00.000Z',
      ])
    })

    it('respects interval=3 (every third day)', () => {
      const r: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01T00:00:00.000Z',
        interval: 3,
        count: 4,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-02-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2026-01-01T00:00:00.000Z',
        '2026-01-04T00:00:00.000Z',
        '2026-01-07T00:00:00.000Z',
        '2026-01-10T00:00:00.000Z',
      ])
    })

    it('terminates on `until`', () => {
      const r: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01T00:00:00.000Z',
        until: '2026-01-03T00:00:00.000Z',
      }
      const occurrences = expandOccurrences(r, {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-12-01T00:00:00.000Z',
      })
      expect(occurrences).toHaveLength(3)
      expect(occurrences[occurrences.length - 1]).toBe('2026-01-03T00:00:00.000Z')
    })
  })

  describe('WEEKLY', () => {
    it('emits the seed-weekday by default', () => {
      // 2026-01-05 is a Monday
      const r: RecurrenceRule = {
        frequency: 'WEEKLY',
        startDate: '2026-01-05T09:00:00.000Z',
        count: 3,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-03-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2026-01-05T09:00:00.000Z',
        '2026-01-12T09:00:00.000Z',
        '2026-01-19T09:00:00.000Z',
      ])
    })

    it('emits multiple byDay values within each week, sorted Mon→Sun', () => {
      const r: RecurrenceRule = {
        frequency: 'WEEKLY',
        startDate: '2026-01-05T09:00:00.000Z', // Monday
        byDay: ['MO', 'WE', 'FR'],
        count: 6,
      }
      const occurrences = expandOccurrences(r, {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-02-01T00:00:00.000Z',
      })
      expect(occurrences).toEqual([
        '2026-01-05T09:00:00.000Z', // Mon
        '2026-01-07T09:00:00.000Z', // Wed
        '2026-01-09T09:00:00.000Z', // Fri
        '2026-01-12T09:00:00.000Z', // Mon
        '2026-01-14T09:00:00.000Z', // Wed
        '2026-01-16T09:00:00.000Z', // Fri
      ])
    })

    it('respects interval=2 (every other week)', () => {
      const r: RecurrenceRule = {
        frequency: 'WEEKLY',
        startDate: '2026-01-05T09:00:00.000Z',
        byDay: ['MO', 'WE'],
        interval: 2,
        count: 4,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-03-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2026-01-05T09:00:00.000Z', // Mon, week 1
        '2026-01-07T09:00:00.000Z', // Wed, week 1
        '2026-01-19T09:00:00.000Z', // Mon, week 3
        '2026-01-21T09:00:00.000Z', // Wed, week 3
      ])
    })

    it('skips byDay occurrences earlier than the seed within the seed week', () => {
      // Seed is Wednesday; MO/TU in the same week must NOT appear.
      const r: RecurrenceRule = {
        frequency: 'WEEKLY',
        startDate: '2026-01-07T09:00:00.000Z', // Wed
        byDay: ['MO', 'WE', 'FR'],
        count: 3,
      }
      const occurrences = expandOccurrences(r, {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-02-01T00:00:00.000Z',
      })
      expect(occurrences).toEqual([
        '2026-01-07T09:00:00.000Z', // Wed
        '2026-01-09T09:00:00.000Z', // Fri
        '2026-01-12T09:00:00.000Z', // Mon (next week)
      ])
    })
  })

  describe('MONTHLY', () => {
    it('emits the seed day-of-month by default', () => {
      const r: RecurrenceRule = {
        frequency: 'MONTHLY',
        startDate: '2026-01-15T12:00:00.000Z',
        count: 4,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2027-01-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2026-01-15T12:00:00.000Z',
        '2026-02-15T12:00:00.000Z',
        '2026-03-15T12:00:00.000Z',
        '2026-04-15T12:00:00.000Z',
      ])
    })

    it('skips invalid byMonthDay values (e.g. 31 in February)', () => {
      const r: RecurrenceRule = {
        frequency: 'MONTHLY',
        startDate: '2026-01-31T00:00:00.000Z',
        byMonthDay: [31],
        count: 7,
      }
      const occurrences = expandOccurrences(r, {
        start: '2026-01-01T00:00:00.000Z',
        end: '2027-01-01T00:00:00.000Z',
      })
      // Months that have 31 days: Jan, Mar, May, Jul, Aug, Oct, Dec
      expect(occurrences).toEqual([
        '2026-01-31T00:00:00.000Z',
        '2026-03-31T00:00:00.000Z',
        '2026-05-31T00:00:00.000Z',
        '2026-07-31T00:00:00.000Z',
        '2026-08-31T00:00:00.000Z',
        '2026-10-31T00:00:00.000Z',
        '2026-12-31T00:00:00.000Z',
      ])
    })

    it('supports negative byMonthDay (-1 = last day of month)', () => {
      const r: RecurrenceRule = {
        frequency: 'MONTHLY',
        startDate: '2026-01-31T00:00:00.000Z',
        byMonthDay: [-1],
        count: 4,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-12-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2026-01-31T00:00:00.000Z',
        '2026-02-28T00:00:00.000Z',
        '2026-03-31T00:00:00.000Z',
        '2026-04-30T00:00:00.000Z',
      ])
    })

    it('supports interval=2 with byMonthDay=[1, 15]', () => {
      const r: RecurrenceRule = {
        frequency: 'MONTHLY',
        startDate: '2026-01-01T00:00:00.000Z',
        byMonthDay: [1, 15],
        interval: 2,
        count: 4,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-12-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2026-01-01T00:00:00.000Z',
        '2026-01-15T00:00:00.000Z',
        '2026-03-01T00:00:00.000Z',
        '2026-03-15T00:00:00.000Z',
      ])
    })
  })

  describe('YEARLY', () => {
    it('emits the seed month/day by default', () => {
      const r: RecurrenceRule = {
        frequency: 'YEARLY',
        startDate: '2026-04-15T00:00:00.000Z',
        count: 3,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2030-01-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2026-04-15T00:00:00.000Z',
        '2027-04-15T00:00:00.000Z',
        '2028-04-15T00:00:00.000Z',
      ])
    })

    it('respects byMonth + byMonthDay (US tax days April 15 + October 15)', () => {
      const r: RecurrenceRule = {
        frequency: 'YEARLY',
        startDate: '2026-04-15T00:00:00.000Z',
        byMonth: [4, 10],
        byMonthDay: [15],
        count: 4,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2030-01-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2026-04-15T00:00:00.000Z',
        '2026-10-15T00:00:00.000Z',
        '2027-04-15T00:00:00.000Z',
        '2027-10-15T00:00:00.000Z',
      ])
    })

    it('handles leap-day rules: Feb 29 only emits in leap years', () => {
      const r: RecurrenceRule = {
        frequency: 'YEARLY',
        startDate: '2024-02-29T00:00:00.000Z',
        count: 3,
      }
      // Leap years from 2024: 2024, 2028, 2032
      expect(
        expandOccurrences(r, {
          start: '2024-01-01T00:00:00.000Z',
          end: '2040-01-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2024-02-29T00:00:00.000Z',
        '2028-02-29T00:00:00.000Z',
        '2032-02-29T00:00:00.000Z',
      ])
    })

    it('respects interval=2 (every 2 years)', () => {
      const r: RecurrenceRule = {
        frequency: 'YEARLY',
        startDate: '2026-06-01T00:00:00.000Z',
        interval: 2,
        count: 3,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2032-01-01T00:00:00.000Z',
        }),
      ).toEqual([
        '2026-06-01T00:00:00.000Z',
        '2028-06-01T00:00:00.000Z',
        '2030-06-01T00:00:00.000Z',
      ])
    })
  })

  describe('termination', () => {
    it('count caps the total occurrences', () => {
      const r: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01T00:00:00.000Z',
        count: 3,
      }
      expect(
        expandOccurrences(r, {
          start: '2026-01-01T00:00:00.000Z',
          end: '2027-01-01T00:00:00.000Z',
        }),
      ).toHaveLength(3)
    })

    it('until inclusively bounds occurrences', () => {
      const r: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01T00:00:00.000Z',
        until: '2026-01-05T00:00:00.000Z',
      }
      const occurrences = expandOccurrences(r, {
        start: '2026-01-01T00:00:00.000Z',
        end: '2027-01-01T00:00:00.000Z',
      })
      expect(occurrences).toEqual([
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
        '2026-01-03T00:00:00.000Z',
        '2026-01-04T00:00:00.000Z',
        '2026-01-05T00:00:00.000Z',
      ])
    })
  })

  describe('DST edge cases', () => {
    it('preserves the seed wall-clock-of-day across US spring-forward (DAILY)', () => {
      // 2026-03-08 02:00 → 03:00 in US Eastern. UTC arithmetic keeps the
      // hour stable: every occurrence is 13:30 UTC regardless of zone.
      const r: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-03-07T13:30:00.000Z',
        count: 4,
      }
      const occurrences = expandOccurrences(r, {
        start: '2026-03-01T00:00:00.000Z',
        end: '2026-03-31T00:00:00.000Z',
      })
      for (const o of occurrences) {
        expect(o.endsWith('T13:30:00.000Z')).toBe(true)
      }
      expect(occurrences).toHaveLength(4)
    })

    it('preserves the seed wall-clock-of-day across US fall-back (WEEKLY)', () => {
      // 2026-11-01: US Eastern falls back. Test that weekly Sunday
      // occurrences keep the same UTC time.
      const r: RecurrenceRule = {
        frequency: 'WEEKLY',
        startDate: '2026-10-25T15:00:00.000Z', // Sunday
        count: 4,
      }
      const occurrences = expandOccurrences(r, {
        start: '2026-10-01T00:00:00.000Z',
        end: '2026-12-01T00:00:00.000Z',
      })
      for (const o of occurrences) {
        expect(o.endsWith('T15:00:00.000Z')).toBe(true)
      }
      expect(occurrences).toEqual([
        '2026-10-25T15:00:00.000Z',
        '2026-11-01T15:00:00.000Z',
        '2026-11-08T15:00:00.000Z',
        '2026-11-15T15:00:00.000Z',
      ])
    })

    it('preserves the seed wall-clock-of-day across DST (MONTHLY)', () => {
      const r: RecurrenceRule = {
        frequency: 'MONTHLY',
        startDate: '2026-02-15T13:30:00.000Z',
        count: 4,
      }
      const occurrences = expandOccurrences(r, {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-12-01T00:00:00.000Z',
      })
      for (const o of occurrences) {
        expect(o.endsWith('T13:30:00.000Z')).toBe(true)
      }
      expect(occurrences).toEqual([
        '2026-02-15T13:30:00.000Z',
        '2026-03-15T13:30:00.000Z', // crosses spring-forward
        '2026-04-15T13:30:00.000Z',
        '2026-05-15T13:30:00.000Z',
      ])
    })
  })

  describe('nextOccurrence', () => {
    const rule: RecurrenceRule = {
      frequency: 'WEEKLY',
      startDate: '2026-01-05T09:00:00.000Z', // Mon
      byDay: ['MO', 'WE', 'FR'],
      count: 6,
    }

    it('defaults to the rule startDate when no `after` is given', () => {
      expect(nextOccurrence(rule)).toBe('2026-01-05T09:00:00.000Z')
    })

    it('returns the seed when after === startDate (inclusive)', () => {
      expect(nextOccurrence(rule, '2026-01-05T09:00:00.000Z')).toBe('2026-01-05T09:00:00.000Z')
    })

    it('returns the next occurrence strictly after a non-occurrence', () => {
      expect(nextOccurrence(rule, '2026-01-06T00:00:00.000Z')).toBe(
        '2026-01-07T09:00:00.000Z', // Wed
      )
    })

    it('returns null after the rule has terminated', () => {
      // count: 6 occurrences total; the last one is Fri 2026-01-16. Anything
      // strictly later returns null.
      expect(nextOccurrence(rule, '2026-01-17T00:00:00.000Z')).toBeNull()
    })

    it('accepts a Date object', () => {
      expect(nextOccurrence(rule, new Date('2026-01-06T00:00:00.000Z'))).toBe(
        '2026-01-07T09:00:00.000Z',
      )
    })
  })

  describe('expandOccurrences window semantics', () => {
    const rule: RecurrenceRule = {
      frequency: 'DAILY',
      startDate: '2026-01-01T00:00:00.000Z',
      count: 10,
    }

    it('start is inclusive, end is exclusive', () => {
      const occurrences = expandOccurrences(rule, {
        start: '2026-01-03T00:00:00.000Z',
        end: '2026-01-06T00:00:00.000Z',
      })
      expect(occurrences).toEqual([
        '2026-01-03T00:00:00.000Z',
        '2026-01-04T00:00:00.000Z',
        '2026-01-05T00:00:00.000Z',
      ])
    })

    it('returns [] when window is empty / inverted', () => {
      expect(
        expandOccurrences(rule, {
          start: '2026-01-05T00:00:00.000Z',
          end: '2026-01-05T00:00:00.000Z',
        }),
      ).toEqual([])
      expect(
        expandOccurrences(rule, {
          start: '2026-01-05T00:00:00.000Z',
          end: '2026-01-04T00:00:00.000Z',
        }),
      ).toEqual([])
    })

    it('throws on malformed window bounds', () => {
      expect(() =>
        expandOccurrences(rule, { start: 'nope', end: '2026-01-05T00:00:00.000Z' }),
      ).toThrow()
    })
  })

  describe('maxOccurrences cap', () => {
    it('caps expandOccurrences output', () => {
      const r: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01T00:00:00.000Z',
      }
      const occurrences = expandOccurrences(
        r,
        { start: '2026-01-01T00:00:00.000Z', end: '2027-01-01T00:00:00.000Z' },
        { maxOccurrences: 5 },
      )
      expect(occurrences).toHaveLength(5)
    })

    it('does NOT count occurrences skipped before the lower bound (aged rules stay answerable)', () => {
      const r: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01T00:00:00.000Z',
      }
      // A far-future lower bound skips ~1461 seed-side occurrences. Under the old
      // iterated-from-seed accounting this returned null (indistinguishable from
      // "rule terminated") the moment a rule aged past maxOccurrences.
      expect(nextOccurrence(r, '2030-01-01T00:00:00.000Z', { maxOccurrences: 5 })).toBe(
        '2030-01-01T00:00:00.000Z',
      )
    })

    it('CONSUMER PROPERTY: a 3-year-old unbounded daily rule still answers with DEFAULT options', () => {
      // The regression this pins: a personal-finance recurring transaction (or
      // habit/medication rule) seeded years ago exceeds the default 1000-occurrence
      // budget just getting from the seed to "today" — nextOccurrence returned null
      // and expandOccurrences returned [] for the current month, both silently.
      const r: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2023-01-15T09:00:00.000Z', // >1200 daily occurrences before mid-2026
      }
      expect(nextOccurrence(r, '2026-06-15T00:00:00.000Z')).toBe('2026-06-15T09:00:00.000Z')

      const june = expandOccurrences(r, {
        start: '2026-06-01T00:00:00.000Z',
        end: '2026-07-01T00:00:00.000Z',
      })
      expect(june).toHaveLength(30)
      expect(june[0]).toBe('2026-06-01T09:00:00.000Z')
      expect(june[29]).toBe('2026-06-30T09:00:00.000Z')
    })

    it('FAILURE DISAMBIGUATION: null now means "rule terminated", never "rule too old"', () => {
      // Same aged rule, but genuinely terminated via `until` → null is correct.
      const terminated: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2023-01-15T09:00:00.000Z',
        until: '2024-01-01T00:00:00.000Z',
      }
      expect(nextOccurrence(terminated, '2026-06-15T00:00:00.000Z')).toBeNull()

      // The identical rule WITHOUT the terminator answers — so a caller reading
      // null can safely conclude the rule ended instead of debugging the engine.
      const unbounded: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2023-01-15T09:00:00.000Z',
      }
      expect(nextOccurrence(unbounded, '2026-06-15T00:00:00.000Z')).not.toBeNull()
    })
  })
})
