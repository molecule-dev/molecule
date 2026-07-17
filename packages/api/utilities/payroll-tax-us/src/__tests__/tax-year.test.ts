import { afterEach, describe, expect, it, vi } from 'vitest'

import { isSupportedTaxYear, resolveTaxYear, SUPPORTED_TAX_YEARS } from '../tax-year.js'

describe('SUPPORTED_TAX_YEARS', () => {
  it('is the single source of truth and lists the shipped years in order', () => {
    expect([...SUPPORTED_TAX_YEARS]).toEqual([2024, 2025])
  })
})

describe('isSupportedTaxYear', () => {
  it('accepts shipped years and rejects everything else', () => {
    expect(isSupportedTaxYear(2024)).toBe(true)
    expect(isSupportedTaxYear(2025)).toBe(true)
    expect(isSupportedTaxYear(2023)).toBe(false)
    expect(isSupportedTaxYear(2026)).toBe(false)
  })
})

describe('resolveTaxYear', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a supported explicit year unchanged', () => {
    expect(resolveTaxYear(2024)).toBe(2024)
    expect(resolveTaxYear(2025)).toBe(2025)
  })

  it('throws a clear, year-naming error for an unsupported explicit year', () => {
    expect(() => resolveTaxYear(2026)).toThrow(/no tax tables for 2026; supported: 2024, 2025/)
    expect(() => resolveTaxYear(2023)).toThrow(/no tax tables for 2023; supported: 2024, 2025/)
  })

  it('omitted → detects the current calendar year and returns it when supported', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-01T00:00:00Z'))
    expect(resolveTaxYear()).toBe(2025)
    expect(resolveTaxYear(undefined)).toBe(2025)
  })

  it('omitted → throws when the current year has no tables (never silently uses a past year)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T00:00:00Z'))
    expect(() => resolveTaxYear()).toThrow(/no tax tables for 2026; supported: 2024, 2025/)
  })
})
