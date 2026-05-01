import { afterEach, describe, expect, it } from 'vitest'

import {
  calculateState,
  getStateCalculator,
  registerStateCalculator,
  stateTaxableWageCents,
  unregisterStateCalculator,
} from '../state.js'
import type { PayrollTaxInput } from '../types.js'

const baseInput: PayrollTaxInput = {
  grossCents: 5_000_00,
  filingStatus: 'single',
  payPeriod: 'biweekly',
  ytdCents: 0,
  year: 2025,
}

describe('stateTaxableWageCents', () => {
  it('subtracts both 401k and health-premium pre-tax deductions', () => {
    expect(
      stateTaxableWageCents({
        ...baseInput,
        preTax: { retirement401k: 250_00, healthPremium: 100_00 },
      }),
    ).toBe(4_650_00)
  })

  it('clamps negative results to zero', () => {
    expect(
      stateTaxableWageCents({
        ...baseInput,
        grossCents: 100_00,
        preTax: { retirement401k: 200_00 },
      }),
    ).toBe(0)
  })
})

describe('TX / FL — no state income tax', () => {
  it('returns 0 for TX', () => {
    expect(calculateState({ ...baseInput, state: 'TX' })).toBe(0)
  })

  it('returns 0 for FL', () => {
    expect(calculateState({ ...baseInput, state: 'FL' })).toBe(0)
  })

  it('returns 0 when no state given', () => {
    expect(calculateState(baseInput)).toBe(0)
  })

  it('returns 0 for an unsupported state code', () => {
    expect(calculateState({ ...baseInput, state: 'ZZ' })).toBe(0)
  })
})

describe('IL — flat 4.95% with allowance exemption', () => {
  it('annualised $130k single (biweekly $5,000), 0 allowances, → ~$247.50/period', () => {
    // Annualised 5_000 * 26 = 130_000. Tax = 130_000 * 0.0495 = 6_435.
    // Per-period = 6_435 / 26 = 247.5.
    const result = calculateState({ ...baseInput, state: 'IL' })
    expect(result).toBe(247_50)
  })

  it('applies $2,775 / allowance personal exemption', () => {
    // 1 allowance → exemption $2,775; annual taxable = 130_000 - 2_775 = 127_225
    // tax annual = 127_225 * 0.0495 = 6_297.6375
    // per-period = 6_297.6375 / 26 ≈ 242.21
    const result = calculateState({
      ...baseInput,
      state: 'IL',
      stateAllowances: 1,
    })
    expect(result).toBe(Math.round((127_225_00 * 0.0495) / 26))
  })

  it('returns 0 for IL when allowances drive taxable to zero', () => {
    // 100 allowances on small wage → exemption ≫ wage
    const result = calculateState({
      ...baseInput,
      state: 'IL',
      stateAllowances: 100,
      grossCents: 100_00,
    })
    expect(result).toBe(0)
  })
})

describe('MA — flat 5%', () => {
  it('5% on per-paycheck wage', () => {
    // $5,000 * 0.05 = $250.00
    expect(calculateState({ ...baseInput, state: 'MA' })).toBe(250_00)
  })

  it('respects pre-tax deductions', () => {
    // Taxable = 5_000 - 250 = 4_750. * 0.05 = 237.50
    expect(
      calculateState({
        ...baseInput,
        state: 'MA',
        preTax: { retirement401k: 250_00 },
      }),
    ).toBe(237_50)
  })
})

describe('CA — Method B progressive with standard deduction', () => {
  it('returns a non-zero result for typical biweekly $5k single 2025', () => {
    // Annualised 130_000. SD single = 5_540. Taxable = 124_460.
    // Brackets:
    //   1.1% [0, 11_257]:        11_257 * 0.011  = 123.827
    //   2.2% [11_257, 26_691]:   15_434 * 0.022  = 339.548
    //   4.4% [26_691, 42_127]:   15_436 * 0.044  = 679.184
    //   6.6% [42_127, 58_485]:   16_358 * 0.066  = 1_079.628
    //   8.8% [58_485, 73_926]:   15_441 * 0.088  = 1_358.808
    //  10.23% [73_926, 124_460]: 50_534 * 0.1023 = 5_169.6282
    // sum ≈ 8_750.62 → /26 ≈ 336.56
    const result = calculateState({ ...baseInput, state: 'CA' })
    expect(result).toBeGreaterThan(330_00)
    expect(result).toBeLessThan(345_00)
  })

  it('uses MFJ schedule for married-jointly', () => {
    // Different schedule should yield a noticeably different number from single.
    const single = calculateState({ ...baseInput, state: 'CA' })
    const mfj = calculateState({
      ...baseInput,
      state: 'CA',
      filingStatus: 'married-jointly',
    })
    expect(single).not.toBe(mfj)
  })

  it('returns 0 for very low wages (taxable below first bracket)', () => {
    // $100/period → annual $2,600 < SD $5,540 → 0
    expect(calculateState({ ...baseInput, state: 'CA', grossCents: 100_00 })).toBe(0)
  })
})

describe('NY — progressive', () => {
  it('returns a non-zero amount for biweekly $5k single 2025', () => {
    // Annualised 130_000. NY brackets single (no SD modeled here):
    //   4%   [0, 8_500]:           8_500 * 0.04   = 340
    //   4.5% [8_500, 11_700]:      3_200 * 0.045  = 144
    //   5.25%[11_700, 13_900]:     2_200 * 0.0525 = 115.5
    //   5.5% [13_900, 80_650]:    66_750 * 0.055  = 3_671.25
    //   6%   [80_650, 130_000]:   49_350 * 0.06   = 2_961
    // sum = 7_231.75 → /26 ≈ 278.14 → 278_14
    expect(calculateState({ ...baseInput, state: 'NY' })).toBe(278_14)
  })

  it('MFJ uses different (wider) brackets than single', () => {
    const single = calculateState({ ...baseInput, state: 'NY' })
    const mfj = calculateState({
      ...baseInput,
      state: 'NY',
      filingStatus: 'married-jointly',
    })
    // MFJ wider brackets at this income → lower withholding.
    expect(mfj).toBeLessThan(single)
  })
})

describe('registry — registerStateCalculator / unregisterStateCalculator', () => {
  afterEach(() => {
    unregisterStateCalculator('OR')
  })

  it('lookups are case-insensitive', () => {
    expect(getStateCalculator('ca')).toBe(getStateCalculator('CA'))
  })

  it('lets callers register a new state', () => {
    registerStateCalculator('OR', () => 99_00)
    expect(calculateState({ ...baseInput, state: 'OR' })).toBe(99_00)
  })

  it('returns 0 after unregistering', () => {
    registerStateCalculator('OR', () => 99_00)
    unregisterStateCalculator('OR')
    expect(calculateState({ ...baseInput, state: 'OR' })).toBe(0)
  })

  it('overrides built-in state calculators', () => {
    const original = getStateCalculator('MA')
    expect(original).toBeDefined()
    registerStateCalculator('MA', () => 0)
    expect(calculateState({ ...baseInput, state: 'MA' })).toBe(0)
    // Restore the built-in.
    if (original) registerStateCalculator('MA', original)
    expect(calculateState({ ...baseInput, state: 'MA' })).toBe(250_00)
  })
})
