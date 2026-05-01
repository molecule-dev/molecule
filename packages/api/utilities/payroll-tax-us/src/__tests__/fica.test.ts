import { describe, expect, it } from 'vitest'

import {
  ADDITIONAL_MEDICARE_FILING_THRESHOLD_CENTS,
  calculateAdditionalMedicare,
  calculateMedicare,
  calculateSocialSecurity,
} from '../fica.js'

describe('Social Security (calculateSocialSecurity)', () => {
  it('applies 6.2% on full per-paycheck wage well under the cap (2025)', () => {
    // $5,000 * 0.062 = $310.00 = 31_000 cents
    expect(calculateSocialSecurity(5_000_00, 0, 2025)).toBe(310_00)
  })

  it('returns 0 when YTD already at the wage cap (2025)', () => {
    // 2025 cap = $176,100
    expect(calculateSocialSecurity(5_000_00, 176_100_00, 2025)).toBe(0)
  })

  it('partially taxes the per-paycheck wage that crosses the cap (2025)', () => {
    // YTD $175,000; this paycheck $5,000 → only $1,100 taxable.
    // $1,100 * 0.062 = $68.20 = 68_20 cents.
    expect(calculateSocialSecurity(5_000_00, 175_000_00, 2025)).toBe(68_20)
  })

  it('uses the 2024 wage cap when year=2024', () => {
    // 2024 cap = $168,600. YTD $168,000; check $1,000 → $600 taxable.
    // $600 * 0.062 = $37.20.
    expect(calculateSocialSecurity(1_000_00, 168_000_00, 2024)).toBe(37_20)
  })

  it('returns 0 for non-positive wages', () => {
    expect(calculateSocialSecurity(0, 0, 2025)).toBe(0)
    expect(calculateSocialSecurity(-100, 0, 2025)).toBe(0)
  })
})

describe('Medicare (calculateMedicare)', () => {
  it('applies 1.45% with no cap', () => {
    // $5,000 * 0.0145 = $72.50 = 72_50 cents
    expect(calculateMedicare(5_000_00)).toBe(72_50)
  })

  it('applies the same rate even at very high wages (no cap)', () => {
    // $1,000,000 * 0.0145 = $14,500
    expect(calculateMedicare(1_000_000_00)).toBe(14_500_00)
  })

  it('returns 0 for non-positive wages', () => {
    expect(calculateMedicare(0)).toBe(0)
    expect(calculateMedicare(-1)).toBe(0)
  })
})

describe('Additional Medicare (calculateAdditionalMedicare)', () => {
  it('returns 0 when YTD + this check is at or below $200K', () => {
    expect(calculateAdditionalMedicare(50_000_00, 100_000_00)).toBe(0)
    expect(calculateAdditionalMedicare(0, 200_000_00)).toBe(0)
  })

  it('applies 0.9% on the portion that crosses $200K threshold', () => {
    // YTD $195,000, paycheck $10,000 → $5,000 over threshold
    // $5,000 * 0.009 = $45.00
    expect(calculateAdditionalMedicare(10_000_00, 195_000_00)).toBe(45_00)
  })

  it('applies 0.9% to the entire paycheck once over threshold', () => {
    // YTD $250,000, paycheck $10,000 → all over threshold
    // $10,000 * 0.009 = $90.00
    expect(calculateAdditionalMedicare(10_000_00, 250_000_00)).toBe(90_00)
  })

  it('exposes filing-status thresholds for downstream true-up', () => {
    expect(ADDITIONAL_MEDICARE_FILING_THRESHOLD_CENTS.single).toBe(200_000_00)
    expect(ADDITIONAL_MEDICARE_FILING_THRESHOLD_CENTS['married-jointly']).toBe(250_000_00)
    expect(ADDITIONAL_MEDICARE_FILING_THRESHOLD_CENTS['married-separately']).toBe(125_000_00)
    expect(ADDITIONAL_MEDICARE_FILING_THRESHOLD_CENTS['head-of-household']).toBe(200_000_00)
  })
})
