import { afterEach, describe, expect, it, vi } from 'vitest'

import { calculatePayrollTax } from '../calculate.js'
import type { TaxYear } from '../tax-year.js'
import type { PayrollTaxInput } from '../types.js'

const baseInput: PayrollTaxInput = {
  grossCents: 5_000_00,
  filingStatus: 'single',
  payPeriod: 'biweekly',
  ytdCents: 0,
  year: 2025,
}

describe('calculatePayrollTax — end-to-end', () => {
  it('produces an internally consistent breakdown (net = gross - taxes - preTax)', () => {
    const r = calculatePayrollTax(baseInput)
    expect(r.taxCents).toBe(
      r.federalCents + r.ficaCents + r.medicareCents + r.additionalMedicareCents + r.stateCents,
    )
    expect(r.preTaxCents).toBe(0)
    expect(r.netCents).toBe(baseInput.grossCents - r.taxCents)
  })

  it('FICA on $5k = $310 SSA + $72.50 Medicare for low YTD', () => {
    const r = calculatePayrollTax(baseInput)
    expect(r.ficaCents).toBe(310_00)
    expect(r.medicareCents).toBe(72_50)
    expect(r.additionalMedicareCents).toBe(0)
  })

  it('TX: zero state withholding', () => {
    const r = calculatePayrollTax({ ...baseInput, state: 'TX' })
    expect(r.stateCents).toBe(0)
  })

  it('CA: applies state withholding', () => {
    const r = calculatePayrollTax({ ...baseInput, state: 'CA' })
    expect(r.stateCents).toBeGreaterThan(0)
  })
})

describe('pay-period frequencies', () => {
  it('weekly + biweekly + semimonthly + monthly + annual all return defined results', () => {
    const periods: PayrollTaxInput['payPeriod'][] = [
      'weekly',
      'biweekly',
      'semimonthly',
      'monthly',
      'annual',
    ]
    for (const p of periods) {
      const r = calculatePayrollTax({ ...baseInput, payPeriod: p })
      expect(Number.isFinite(r.federalCents)).toBe(true)
      expect(r.federalCents).toBeGreaterThanOrEqual(0)
      expect(r.taxCents).toBeGreaterThanOrEqual(r.ficaCents + r.medicareCents)
    }
  })

  it('monthly and weekly approximate the same annual when scaled', () => {
    const monthly = calculatePayrollTax({
      ...baseInput,
      payPeriod: 'monthly',
      grossCents: 8_000_00,
    })
    const weekly = calculatePayrollTax({
      ...baseInput,
      payPeriod: 'weekly',
      // Same annual as $8k/month → $96k/yr → $1,846.15/wk.
      grossCents: Math.round(96_000_00 / 52),
    })
    // 12 monthly federal ≈ 52 weekly federal (within $5)
    expect(Math.abs(12 * monthly.federalCents - 52 * weekly.federalCents)).toBeLessThan(500_00)
  })
})

describe('pre-tax deductions', () => {
  it('401(k) reduces federal taxable wages but NOT FICA wages', () => {
    const noContrib = calculatePayrollTax(baseInput)
    const withContrib = calculatePayrollTax({
      ...baseInput,
      preTax: { retirement401k: 500_00 },
    })
    // FICA: 6.2% of full $5k = $310 either way.
    expect(withContrib.ficaCents).toBe(noContrib.ficaCents)
    expect(withContrib.medicareCents).toBe(noContrib.medicareCents)
    // Federal: drops because taxable wage is now $4,500.
    expect(withContrib.federalCents).toBeLessThan(noContrib.federalCents)
  })

  it('Section 125 health premiums reduce BOTH federal AND FICA wages', () => {
    const noContrib = calculatePayrollTax(baseInput)
    const withHealth = calculatePayrollTax({
      ...baseInput,
      preTax: { healthPremium: 200_00 },
    })
    // FICA: drops because taxable FICA wage is now $4,800.
    // 4_800_00 * 0.062 = 297.60 → 297_60
    expect(withHealth.ficaCents).toBe(297_60)
    // Medicare: 4_800_00 * 0.0145 = 69.60
    expect(withHealth.medicareCents).toBe(69_60)
    expect(withHealth.federalCents).toBeLessThan(noContrib.federalCents)
  })

  it('preTaxCents is summed and subtracted from net', () => {
    const r = calculatePayrollTax({
      ...baseInput,
      preTax: { retirement401k: 250_00, healthPremium: 100_00 },
    })
    expect(r.preTaxCents).toBe(350_00)
    expect(r.netCents).toBe(baseInput.grossCents - r.taxCents - r.preTaxCents)
  })

  it('rejects negative pre-tax amounts (clamped to 0)', () => {
    const r = calculatePayrollTax({
      ...baseInput,
      preTax: { retirement401k: -100, healthPremium: -200 },
    })
    expect(r.preTaxCents).toBe(0)
  })
})

describe('high-income behavior', () => {
  it('Additional Medicare kicks in once YTD wages exceed $200K', () => {
    const r = calculatePayrollTax({
      ...baseInput,
      grossCents: 10_000_00,
      ytdCents: 195_000_00,
    })
    // $5k of this paycheck is over the $200K employer threshold.
    // 0.9% * $5k = $45.
    expect(r.additionalMedicareCents).toBe(45_00)
  })

  it('SSA caps out: zero ficaCents when YTD already at 2025 cap', () => {
    const r = calculatePayrollTax({
      ...baseInput,
      grossCents: 5_000_00,
      ytdCents: 176_100_00,
      year: 2025,
    })
    expect(r.ficaCents).toBe(0)
    // Medicare still applies (no cap).
    expect(r.medicareCents).toBe(72_50)
  })
})

describe('tax-year selector', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('different years produce different federal numbers (brackets shift)', () => {
    const a = calculatePayrollTax({ ...baseInput, year: 2024 })
    const b = calculatePayrollTax({ ...baseInput, year: 2025 })
    // 2025 brackets are wider → lower withholding for the same wage.
    expect(b.federalCents).toBeLessThan(a.federalCents)
  })

  it('2024 and 2025 both compute a full, positive federal withholding', () => {
    for (const year of [2024, 2025] as const) {
      const r = calculatePayrollTax({ ...baseInput, year })
      expect(Number.isFinite(r.federalCents)).toBe(true)
      expect(r.federalCents).toBeGreaterThan(0)
    }
  })

  it('omitting year uses the CURRENT year and works when it is supported', () => {
    // Freeze the clock inside the supported window.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T00:00:00Z'))
    const omitted = calculatePayrollTax({
      grossCents: baseInput.grossCents,
      filingStatus: baseInput.filingStatus,
      payPeriod: baseInput.payPeriod,
      ytdCents: baseInput.ytdCents,
    })
    const explicit = calculatePayrollTax({ ...baseInput, year: 2025 })
    expect(omitted.federalCents).toBe(explicit.federalCents)
  })

  it('omitting year THROWS (naming supported years) when the current year has no tables', () => {
    // A caller in 2026+ must NOT silently get stale 2025 tables.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00Z'))
    expect(() =>
      calculatePayrollTax({
        grossCents: baseInput.grossCents,
        filingStatus: baseInput.filingStatus,
        payPeriod: baseInput.payPeriod,
        ytdCents: baseInput.ytdCents,
      }),
    ).toThrow(/no tax tables for 2026; supported: 2024, 2025/)
  })

  it('an explicitly-passed unsupported year THROWS naming the supported years', () => {
    expect(() =>
      // Cast: simulate an untyped JS caller passing a year with no tables.
      calculatePayrollTax({ ...baseInput, year: 2099 as unknown as TaxYear }),
    ).toThrow(/no tax tables for 2099; supported: 2024, 2025/)
  })
})
