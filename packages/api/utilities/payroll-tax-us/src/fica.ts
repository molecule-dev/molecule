/**
 * FICA (Social Security + Medicare) withholding for the employee share.
 *
 * - Social Security: 6.2% on wages up to the annual SSA wage base; capped.
 * - Medicare: 1.45% on every dollar of wages; uncapped.
 * - Additional Medicare: 0.9% on YTD wages above a filing-status threshold.
 *   Per IRS rules, an employer must begin withholding the 0.9% on a per-pay
 *   basis once an employee's YTD wages exceed $200,000 in a calendar year,
 *   regardless of filing status; the threshold-based reconciliation happens
 *   on the employee's annual return. We model the per-pay employer rule.
 *
 * All amounts are integer cents. Pure functions.
 *
 * @module
 */

import { resolveTaxYear, type TaxYear } from './tax-year.js'
import type { FilingStatus } from './types.js'

/** Annual Social-Security wage base by year (integer cents). */
const SS_WAGE_BASE_CENTS: Record<TaxYear, number> = {
  2024: 16_8600_00, // $168,600
  2025: 17_6100_00, // $176,100
}

/** Social Security tax rate (employee share). */
const SS_RATE = 0.062

/** Regular Medicare tax rate. */
const MEDICARE_RATE = 0.0145

/** Additional Medicare tax rate (0.9%) above threshold. */
const ADDITIONAL_MEDICARE_RATE = 0.009

/**
 * Per-employer additional-Medicare withholding threshold ($200,000 YTD
 * wages, every filing status). Reconciliation against the actual
 * filing-status threshold happens on Form 8959 at year-end.
 */
const ADDITIONAL_MEDICARE_EMPLOYER_THRESHOLD_CENTS = 200_000_00

/**
 * Annual filing-status thresholds for the employee's own Additional
 * Medicare reconciliation. Exposed for test parity and for callers
 * that want to compute the year-end true-up amount.
 */
export const ADDITIONAL_MEDICARE_FILING_THRESHOLD_CENTS: Record<FilingStatus, number> = {
  single: 200_000_00,
  'married-jointly': 250_000_00,
  'married-separately': 125_000_00,
  'head-of-household': 200_000_00,
}

/**
 * Compute the Social Security tax withholding for a single paycheck.
 *
 * @param ficaWageCents - FICA-taxable wages for this paycheck (post-Section-125, but pre-401k).
 * @param ytdCents - Year-to-date FICA-eligible wages already paid (pre this paycheck).
 * @param year - Tax year selector. Omit to use the current calendar year; an
 *   unsupported year (omitted or explicit) throws — see {@link resolveTaxYear}.
 * @returns Social Security tax withheld this period, in integer cents.
 * @throws {Error} When the resolved year has no Social-Security wage base.
 */
export function calculateSocialSecurity(
  ficaWageCents: number,
  ytdCents: number,
  year?: TaxYear,
): number {
  const cap = SS_WAGE_BASE_CENTS[resolveTaxYear(year)]
  if (ytdCents >= cap) return 0
  const remaining = cap - ytdCents
  const taxable = Math.min(ficaWageCents, remaining)
  if (taxable <= 0) return 0
  return Math.round(taxable * SS_RATE)
}

/**
 * Compute the regular (1.45%) Medicare tax withholding for a single paycheck.
 *
 * @param ficaWageCents - FICA-taxable wages for this paycheck.
 * @returns Medicare tax withheld this period, in integer cents.
 */
export function calculateMedicare(ficaWageCents: number): number {
  if (ficaWageCents <= 0) return 0
  return Math.round(ficaWageCents * MEDICARE_RATE)
}

/**
 * Compute the Additional Medicare Tax (0.9%) withholding for a single
 * paycheck, applying the per-employer $200,000 YTD threshold.
 *
 * @param ficaWageCents - FICA-taxable wages for this paycheck.
 * @param ytdCents - Year-to-date FICA-eligible wages already paid (pre this paycheck).
 * @returns Additional Medicare tax withheld this period, in integer cents.
 */
export function calculateAdditionalMedicare(ficaWageCents: number, ytdCents: number): number {
  const threshold = ADDITIONAL_MEDICARE_EMPLOYER_THRESHOLD_CENTS
  const newYtd = ytdCents + ficaWageCents
  if (newYtd <= threshold) return 0
  const taxable = Math.min(ficaWageCents, newYtd - threshold)
  if (taxable <= 0) return 0
  return Math.round(taxable * ADDITIONAL_MEDICARE_RATE)
}
