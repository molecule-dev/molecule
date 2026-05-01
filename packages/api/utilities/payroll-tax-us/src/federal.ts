/**
 * Federal income-tax withholding (employee share) using the IRS
 * Pub 15-T annualised wage-bracket method, simplified to the
 * "Standard withholding" tables that apply when Form W-4 boxes
 * 2c (multiple jobs) is unchecked and amounts on lines 4a/4b/4c
 * are zero. This covers the overwhelming majority of employees
 * and is sufficient for payroll-manager / scaffolded payroll apps.
 *
 * Tables are pinned to IRS Pub 15-T 2024 and 2025. To extend,
 * add a new year to {@link FEDERAL_BRACKETS} and bump
 * {@link TaxYear} in `types.ts`.
 *
 * All amounts are integer cents. Pure functions.
 *
 * @module
 */

import type { FilingStatus, PayPeriod, TaxBracket, TaxYear } from './types.js'

/**
 * Pay-period multipliers used to annualise per-paycheck wages.
 * The "annual" period is its own identity (no scaling).
 */
export const PERIODS_PER_YEAR: Record<PayPeriod, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  annual: 1,
}

/**
 * Federal annualised withholding brackets per IRS Pub 15-T.
 *
 * Each bracket entry is `[thresholdCents, marginalRate]`. The first
 * bracket starts at the post-standard-deduction taxable wage of $0;
 * the standard deduction is applied separately via
 * {@link FEDERAL_STANDARD_DEDUCTION}.
 *
 * Sourced from IRS Pub 15-T (2024 and 2025), "Annual Payroll Period —
 * Standard withholding" tables for Form W-4 from 2020 or later.
 */
export const FEDERAL_BRACKETS: Record<TaxYear, Record<FilingStatus, TaxBracket[]>> = {
  2024: {
    single: [
      { thresholdCents: 0, rate: 0.0 },
      { thresholdCents: 6_000_00, rate: 0.1 },
      { thresholdCents: 17_600_00, rate: 0.12 },
      { thresholdCents: 53_150_00, rate: 0.22 },
      { thresholdCents: 106_525_00, rate: 0.24 },
      { thresholdCents: 197_950_00, rate: 0.32 },
      { thresholdCents: 249_725_00, rate: 0.35 },
      { thresholdCents: 615_350_00, rate: 0.37 },
    ],
    'married-jointly': [
      { thresholdCents: 0, rate: 0.0 },
      { thresholdCents: 16_300_00, rate: 0.1 },
      { thresholdCents: 39_500_00, rate: 0.12 },
      { thresholdCents: 110_600_00, rate: 0.22 },
      { thresholdCents: 217_350_00, rate: 0.24 },
      { thresholdCents: 400_200_00, rate: 0.32 },
      { thresholdCents: 503_750_00, rate: 0.35 },
      { thresholdCents: 747_500_00, rate: 0.37 },
    ],
    'married-separately': [
      { thresholdCents: 0, rate: 0.0 },
      { thresholdCents: 6_000_00, rate: 0.1 },
      { thresholdCents: 17_600_00, rate: 0.12 },
      { thresholdCents: 53_150_00, rate: 0.22 },
      { thresholdCents: 106_525_00, rate: 0.24 },
      { thresholdCents: 197_950_00, rate: 0.32 },
      { thresholdCents: 249_725_00, rate: 0.35 },
      { thresholdCents: 615_350_00, rate: 0.37 },
    ],
    'head-of-household': [
      { thresholdCents: 0, rate: 0.0 },
      { thresholdCents: 13_300_00, rate: 0.1 },
      { thresholdCents: 29_850_00, rate: 0.12 },
      { thresholdCents: 76_400_00, rate: 0.22 },
      { thresholdCents: 113_800_00, rate: 0.24 },
      { thresholdCents: 205_250_00, rate: 0.32 },
      { thresholdCents: 257_000_00, rate: 0.35 },
      { thresholdCents: 622_650_00, rate: 0.37 },
    ],
  },
  2025: {
    single: [
      { thresholdCents: 0, rate: 0.0 },
      { thresholdCents: 6_400_00, rate: 0.1 },
      { thresholdCents: 18_325_00, rate: 0.12 },
      { thresholdCents: 54_875_00, rate: 0.22 },
      { thresholdCents: 109_750_00, rate: 0.24 },
      { thresholdCents: 203_700_00, rate: 0.32 },
      { thresholdCents: 256_925_00, rate: 0.35 },
      { thresholdCents: 632_750_00, rate: 0.37 },
    ],
    'married-jointly': [
      { thresholdCents: 0, rate: 0.0 },
      { thresholdCents: 17_100_00, rate: 0.1 },
      { thresholdCents: 40_950_00, rate: 0.12 },
      { thresholdCents: 114_050_00, rate: 0.22 },
      { thresholdCents: 223_800_00, rate: 0.24 },
      { thresholdCents: 411_700_00, rate: 0.32 },
      { thresholdCents: 518_150_00, rate: 0.35 },
      { thresholdCents: 768_700_00, rate: 0.37 },
    ],
    'married-separately': [
      { thresholdCents: 0, rate: 0.0 },
      { thresholdCents: 6_400_00, rate: 0.1 },
      { thresholdCents: 18_325_00, rate: 0.12 },
      { thresholdCents: 54_875_00, rate: 0.22 },
      { thresholdCents: 109_750_00, rate: 0.24 },
      { thresholdCents: 203_700_00, rate: 0.32 },
      { thresholdCents: 256_925_00, rate: 0.35 },
      { thresholdCents: 632_750_00, rate: 0.37 },
    ],
    'head-of-household': [
      { thresholdCents: 0, rate: 0.0 },
      { thresholdCents: 13_900_00, rate: 0.1 },
      { thresholdCents: 30_900_00, rate: 0.12 },
      { thresholdCents: 78_750_00, rate: 0.22 },
      { thresholdCents: 117_250_00, rate: 0.24 },
      { thresholdCents: 211_200_00, rate: 0.32 },
      { thresholdCents: 264_400_00, rate: 0.35 },
      { thresholdCents: 640_250_00, rate: 0.37 },
    ],
  },
}

/**
 * Standard deduction (already baked into the Pub 15-T bracket
 * thresholds above). We expose it for callers that want to reason
 * about pre-deduction taxable wages — but {@link calculateFederal}
 * does NOT subtract it, since the brackets already account for it.
 */
export const FEDERAL_STANDARD_DEDUCTION: Record<TaxYear, Record<FilingStatus, number>> = {
  2024: {
    single: 14_600_00,
    'married-jointly': 29_200_00,
    'married-separately': 14_600_00,
    'head-of-household': 21_900_00,
  },
  2025: {
    single: 15_000_00,
    'married-jointly': 30_000_00,
    'married-separately': 15_000_00,
    'head-of-household': 22_500_00,
  },
}

/**
 * Annualise a per-period wage to its yearly equivalent.
 *
 * @param wageCents - Per-paycheck wage in cents.
 * @param period - Pay frequency.
 * @returns Annualised wage in cents.
 */
export function annualise(wageCents: number, period: PayPeriod): number {
  return wageCents * PERIODS_PER_YEAR[period]
}

/**
 * Apply progressive tax brackets to an annualised taxable wage.
 *
 * @param taxableAnnualCents - Taxable annual wage in cents.
 * @param brackets - Bracket table (sorted ascending by threshold).
 * @returns Annual tax in cents.
 */
export function applyBrackets(taxableAnnualCents: number, brackets: TaxBracket[]): number {
  if (taxableAnnualCents <= 0) return 0
  let tax = 0
  for (let i = 0; i < brackets.length; i += 1) {
    const cur = brackets[i]
    const next = brackets[i + 1]
    if (taxableAnnualCents <= cur.thresholdCents) break
    const upper =
      next !== undefined ? Math.min(taxableAnnualCents, next.thresholdCents) : taxableAnnualCents
    const slice = upper - cur.thresholdCents
    if (slice > 0) tax += slice * cur.rate
    if (next === undefined || taxableAnnualCents <= next.thresholdCents) break
  }
  return tax
}

/**
 * Compute the federal income-tax withholding for a single paycheck
 * using the IRS Pub 15-T annualised wage-bracket method.
 *
 * @param taxableCents - Per-paycheck federal-taxable wages (gross minus pre-tax deductions).
 * @param filingStatus - Federal filing status.
 * @param period - Pay frequency.
 * @param year - Tax year (defaults to 2025).
 * @returns Federal withholding for this paycheck in integer cents.
 */
export function calculateFederal(
  taxableCents: number,
  filingStatus: FilingStatus,
  period: PayPeriod,
  year: TaxYear = 2025,
): number {
  if (taxableCents <= 0) return 0
  const annual = annualise(taxableCents, period)
  const brackets = FEDERAL_BRACKETS[year][filingStatus]
  const annualTax = applyBrackets(annual, brackets)
  const perPeriod = annualTax / PERIODS_PER_YEAR[period]
  return Math.max(0, Math.round(perPeriod))
}
