/**
 * Tests for the payment utility functions.
 */

import { describe, expect, it } from 'vitest'

import { getPeriodTime } from '../utilities.js'

describe('getPeriodTime', () => {
  it('should return a positive number for "month"', () => {
    const result = getPeriodTime('month')
    expect(result).toBeGreaterThan(0)
  })

  it('should return a positive number for "year"', () => {
    const result = getPeriodTime('year')
    expect(result).toBeGreaterThan(0)
  })

  it('should return 0 for empty string period', () => {
    const result = getPeriodTime('')
    expect(result).toBe(0)
  })

  it('should return approximately 1/12 of a year for "month"', () => {
    const monthTime = getPeriodTime('month')
    const yearTime = getPeriodTime('year')

    // monthTime should be approximately yearTime / 12
    const expectedMonthTime = Math.round(yearTime / 12)
    expect(monthTime).toBe(expectedMonthTime)
  })

  it('should return approximately 365.25 days in milliseconds for "year"', () => {
    const yearTime = getPeriodTime('year')

    // A year is approximately 365-366 days in milliseconds
    const minYear = 365 * 24 * 60 * 60 * 1000 // 365 days
    const maxYear = 366 * 24 * 60 * 60 * 1000 // 366 days

    expect(yearTime).toBeGreaterThanOrEqual(minYear)
    expect(yearTime).toBeLessThanOrEqual(maxYear)
  })

  it('should return approximately 28-31 days in milliseconds for "month"', () => {
    const monthTime = getPeriodTime('month')

    // A month is approximately 28-31 days in milliseconds
    const minMonth = 28 * 24 * 60 * 60 * 1000 // 28 days
    const maxMonth = 31 * 24 * 60 * 60 * 1000 // 31 days

    expect(monthTime).toBeGreaterThanOrEqual(minMonth)
    expect(monthTime).toBeLessThanOrEqual(maxMonth)
  })

  it('should return year time exactly 12 times the month time', () => {
    const monthTime = getPeriodTime('month')
    const yearTime = getPeriodTime('year')

    // Due to rounding, monthTime * 12 should be very close to yearTime
    // The difference is from Math.round in getOneMonthTime
    const difference = Math.abs(yearTime - monthTime * 12)
    // Allow up to 11ms difference due to rounding (at most 1 per round)
    expect(difference).toBeLessThanOrEqual(11)
  })

  it('should return consistent values across multiple calls', () => {
    const first = getPeriodTime('month')
    const second = getPeriodTime('month')
    // Values should be very close (within a few ms due to time passing between calls)
    expect(Math.abs(first - second)).toBeLessThan(1000)
  })
})
