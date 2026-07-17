import { describe, expect, it } from 'vitest'

import { cronMatches, isScheduleDue, parseCronField } from '../scheduling.js'
import type { StoredSchedule } from '../types.js'

const at = (iso: string): Date => new Date(iso)

const scheduleWith = (cron: string, lastRunAt: string | null = null): StoredSchedule => ({
  id: 's1',
  name: 'Report',
  query: { table: 'orders', measures: [{ field: '*', function: 'count' }] },
  format: 'csv',
  schedule: cron,
  recipients: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  lastRunAt,
})

describe('parseCronField', () => {
  it('expands a wildcard to the full range', () => {
    expect(parseCronField('*', 0, 3)).toEqual(new Set([0, 1, 2, 3]))
  })

  it('parses a single value', () => {
    expect(parseCronField('5', 0, 59)).toEqual(new Set([5]))
  })

  it('parses a range', () => {
    expect(parseCronField('1-4', 0, 59)).toEqual(new Set([1, 2, 3, 4]))
  })

  it('parses a wildcard step', () => {
    expect(parseCronField('*/15', 0, 59)).toEqual(new Set([0, 15, 30, 45]))
  })

  it('parses a range with a step', () => {
    expect(parseCronField('0-20/5', 0, 59)).toEqual(new Set([0, 5, 10, 15, 20]))
  })

  it('parses a comma list of mixed forms', () => {
    expect(parseCronField('0,30,45', 0, 59)).toEqual(new Set([0, 30, 45]))
  })

  it('parses a bare value with step as "from value to max, every step"', () => {
    expect(parseCronField('50/5', 0, 59)).toEqual(new Set([50, 55]))
  })

  it('throws on a non-positive step', () => {
    expect(() => parseCronField('*/0', 0, 59)).toThrow()
  })

  it('throws on non-numeric input', () => {
    expect(() => parseCronField('abc', 0, 59)).toThrow()
  })
})

describe('cronMatches', () => {
  it('matches "every minute"', () => {
    expect(cronMatches('* * * * *', at('2024-06-15T09:30:00Z'))).toBe(true)
  })

  it('matches a specific minute and hour', () => {
    expect(cronMatches('30 9 * * *', at('2024-06-15T09:30:00Z'))).toBe(true)
    expect(cronMatches('30 9 * * *', at('2024-06-15T09:31:00Z'))).toBe(false)
    expect(cronMatches('30 9 * * *', at('2024-06-15T10:30:00Z'))).toBe(false)
  })

  it('matches a day-of-week (Monday = 1)', () => {
    // 2024-06-17 is a Monday.
    expect(cronMatches('0 0 * * 1', at('2024-06-17T00:00:00Z'))).toBe(true)
    expect(cronMatches('0 0 * * 1', at('2024-06-18T00:00:00Z'))).toBe(false)
  })

  it('treats both 0 and 7 as Sunday', () => {
    // 2024-06-16 is a Sunday.
    expect(cronMatches('0 0 * * 0', at('2024-06-16T00:00:00Z'))).toBe(true)
    expect(cronMatches('0 0 * * 7', at('2024-06-16T00:00:00Z'))).toBe(true)
  })

  it('uses OR semantics when both day-of-month and day-of-week are restricted', () => {
    // dom=1 OR dow=Mon. 2024-06-01 is a Saturday (matches dom).
    expect(cronMatches('0 0 1 * 1', at('2024-06-01T00:00:00Z'))).toBe(true)
    // 2024-06-17 is a Monday (matches dow).
    expect(cronMatches('0 0 1 * 1', at('2024-06-17T00:00:00Z'))).toBe(true)
    // 2024-06-18 is a Tuesday, not the 1st — matches neither.
    expect(cronMatches('0 0 1 * 1', at('2024-06-18T00:00:00Z'))).toBe(false)
  })

  it('matches a specific month', () => {
    expect(cronMatches('0 0 1 6 *', at('2024-06-01T00:00:00Z'))).toBe(true)
    expect(cronMatches('0 0 1 6 *', at('2024-07-01T00:00:00Z'))).toBe(false)
  })

  it('throws on an expression without exactly 5 fields', () => {
    expect(() => cronMatches('* * * *', at('2024-06-15T09:30:00Z'))).toThrow()
  })
})

describe('isScheduleDue', () => {
  it('is due when the cron matches the current minute and it never ran', () => {
    expect(isScheduleDue(scheduleWith('30 9 * * *'), at('2024-06-15T09:30:00Z'))).toBe(true)
  })

  it('is not due when the cron does not match', () => {
    expect(isScheduleDue(scheduleWith('30 9 * * *'), at('2024-06-15T10:30:00Z'))).toBe(false)
  })

  it('is not due when it already ran during the same minute', () => {
    const schedule = scheduleWith('30 9 * * *', '2024-06-15T09:30:20.000Z')
    expect(isScheduleDue(schedule, at('2024-06-15T09:30:50Z'))).toBe(false)
  })

  it('is due again on a later matching minute even if it ran earlier', () => {
    const schedule = scheduleWith('* * * * *', '2024-06-15T09:30:00.000Z')
    expect(isScheduleDue(schedule, at('2024-06-15T09:31:00Z'))).toBe(true)
  })

  it('ignores an unparseable lastRunAt (treats as not-run-this-minute)', () => {
    const schedule = scheduleWith('30 9 * * *', 'not-a-date')
    expect(isScheduleDue(schedule, at('2024-06-15T09:30:00Z'))).toBe(true)
  })
})
