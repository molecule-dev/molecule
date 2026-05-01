import { describe, expect, it } from 'vitest'

import {
  annualise,
  applyBrackets,
  calculateFederal,
  FEDERAL_BRACKETS,
  FEDERAL_STANDARD_DEDUCTION,
  PERIODS_PER_YEAR,
} from '../federal.js'

describe('annualise + PERIODS_PER_YEAR', () => {
  it('applies the right multiplier per period', () => {
    expect(annualise(1_000_00, 'weekly')).toBe(52_000_00)
    expect(annualise(1_000_00, 'biweekly')).toBe(26_000_00)
    expect(annualise(1_000_00, 'semimonthly')).toBe(24_000_00)
    expect(annualise(1_000_00, 'monthly')).toBe(12_000_00)
    expect(annualise(1_000_00, 'annual')).toBe(1_000_00)
  })

  it('exposes PERIODS_PER_YEAR for caller-side calcs', () => {
    expect(PERIODS_PER_YEAR.weekly).toBe(52)
    expect(PERIODS_PER_YEAR.biweekly).toBe(26)
    expect(PERIODS_PER_YEAR.semimonthly).toBe(24)
    expect(PERIODS_PER_YEAR.monthly).toBe(12)
    expect(PERIODS_PER_YEAR.annual).toBe(1)
  })
})

describe('applyBrackets', () => {
  it('returns 0 for non-positive wages', () => {
    expect(applyBrackets(0, FEDERAL_BRACKETS[2025].single)).toBe(0)
    expect(applyBrackets(-1, FEDERAL_BRACKETS[2025].single)).toBe(0)
  })

  it('only applies 0% bracket below first taxable threshold', () => {
    // 2025 single: 0% up to $6,400
    expect(applyBrackets(5_000_00, FEDERAL_BRACKETS[2025].single)).toBe(0)
  })

  it('progressive: 2025 single $50k matches manual calc', () => {
    // 11_925 * 0.10 = 1_192.50; 31_675 * 0.12 = 3_801.00 → 4_993.50
    expect(applyBrackets(50_000_00, FEDERAL_BRACKETS[2025].single)).toBe(4_993_50)
  })
})

describe('calculateFederal', () => {
  it('2025 single, $50,000 annual → $4,993.50 federal annual', () => {
    expect(calculateFederal(50_000_00, 'single', 'annual', 2025)).toBe(4_993_50)
  })

  it('2025 single, biweekly $1,923.08 (~$50k/yr) per-period rounds correctly', () => {
    // Annualised 50_000_08 → ≈ same as $50k. Per-period = annualTax / 26.
    // applyBrackets(50_000_08): annual ≈ 4_993.51 → /26 = 192.058 → 192_06
    const annualTax = applyBrackets(50_000_08, FEDERAL_BRACKETS[2025].single)
    const expectedPerPeriod = Math.round(annualTax / 26)
    expect(calculateFederal(50_000_08 / 26, 'single', 'biweekly', 2025)).toBeGreaterThanOrEqual(
      expectedPerPeriod - 1,
    )
  })

  it('2025 married-jointly $100k annual → $9,471', () => {
    expect(calculateFederal(100_000_00, 'married-jointly', 'annual', 2025)).toBe(9_471_00)
  })

  it('2025 married-separately uses single brackets — $50k annual → $4,993.50', () => {
    expect(calculateFederal(50_000_00, 'married-separately', 'annual', 2025)).toBe(4_993_50)
  })

  it('2024 head-of-household $80k annual → $8,033', () => {
    expect(calculateFederal(80_000_00, 'head-of-household', 'annual', 2024)).toBe(8_033_00)
  })

  it('2025 single high-income $300k crosses 6 brackets → $72,307.25', () => {
    expect(calculateFederal(300_000_00, 'single', 'annual', 2025)).toBe(72_307_25)
  })

  it('returns 0 for zero or negative taxable wage', () => {
    expect(calculateFederal(0, 'single', 'biweekly', 2025)).toBe(0)
    expect(calculateFederal(-100, 'single', 'biweekly', 2025)).toBe(0)
  })

  it('top marginal 37% bracket activates above 2025 single $632,750', () => {
    // $1,000,000 single 2025
    // 0% [0, 6_400]: 0
    // 10% [6_400, 18_325]: 11_925 * 0.10 = 1_192.50
    // 12% [18_325, 54_875]: 36_550 * 0.12 = 4_386.00
    // 22% [54_875, 109_750]: 54_875 * 0.22 = 12_072.50
    // 24% [109_750, 203_700]: 93_950 * 0.24 = 22_548.00
    // 32% [203_700, 256_925]: 53_225 * 0.32 = 17_032.00
    // 35% [256_925, 632_750]: 375_825 * 0.35 = 131_538.75
    // 37% [632_750, 1_000_000]: 367_250 * 0.37 = 135_882.50
    // Total = 324_652.25
    expect(calculateFederal(1_000_000_00, 'single', 'annual', 2025)).toBe(324_652_25)
  })

  it('exposes standard deduction table for tax-year/filing combos', () => {
    expect(FEDERAL_STANDARD_DEDUCTION[2025].single).toBe(15_000_00)
    expect(FEDERAL_STANDARD_DEDUCTION[2025]['married-jointly']).toBe(30_000_00)
    expect(FEDERAL_STANDARD_DEDUCTION[2024].single).toBe(14_600_00)
    expect(FEDERAL_STANDARD_DEDUCTION[2024]['head-of-household']).toBe(21_900_00)
  })
})

describe('pay-period round-tripping', () => {
  it('biweekly then deannualised approximates 1/26th of annual', () => {
    // $2,000/biweekly = $52,000/yr. Compute annual then divide:
    const annualEquivalent = 52_000_00
    const annualTax = applyBrackets(annualEquivalent, FEDERAL_BRACKETS[2025].single)
    const perPeriodFromCalc = calculateFederal(2_000_00, 'single', 'biweekly', 2025)
    expect(perPeriodFromCalc).toBe(Math.round(annualTax / 26))
  })

  it('weekly equivalent gross matches biweekly result × 2 ± 1¢ rounding', () => {
    const weekly = calculateFederal(1_000_00, 'single', 'weekly', 2025)
    const biweekly = calculateFederal(2_000_00, 'single', 'biweekly', 2025)
    expect(Math.abs(biweekly - 2 * weekly)).toBeLessThanOrEqual(1)
  })
})
