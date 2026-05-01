/**
 * Top-level payroll-tax calculator: combines federal, FICA, Medicare,
 * Additional Medicare, and state withholding into a single per-paycheck
 * breakdown.
 *
 * @module
 */

import { calculateAdditionalMedicare, calculateMedicare, calculateSocialSecurity } from './fica.js'
import { calculateFederal } from './federal.js'
import { calculateState } from './state.js'
import type { PayrollTaxInput, PayrollTaxResult } from './types.js'

/**
 * Compute the per-paycheck tax breakdown for a US W-2 employee.
 *
 * Pre-tax handling:
 * - 401(k) contributions reduce federal + state taxable wages but NOT FICA wages.
 * - Section 125 health premiums reduce federal + FICA + state taxable wages.
 *
 * @param input - Per-paycheck input record. See {@link PayrollTaxInput}.
 * @returns Per-paycheck breakdown including a `netCents` take-home figure.
 *
 * @example
 * ```ts
 * import { calculatePayrollTax } from '@molecule/api-payroll-tax-us'
 *
 * calculatePayrollTax({
 *   grossCents: 5_000_00,
 *   filingStatus: 'single',
 *   payPeriod: 'biweekly',
 *   ytdCents: 0,
 *   state: 'CA',
 *   year: 2025,
 *   preTax: { retirement401k: 250_00, healthPremium: 100_00 },
 * })
 * ```
 */
export function calculatePayrollTax(input: PayrollTaxInput): PayrollTaxResult {
  const year = input.year ?? 2025
  const pre = input.preTax ?? {}
  const retirement401k = Math.max(0, pre.retirement401k ?? 0)
  const healthPremium = Math.max(0, pre.healthPremium ?? 0)
  const preTaxCents = retirement401k + healthPremium

  // Federal taxable wages: gross minus 401k and Section 125 premiums.
  const federalWageCents = Math.max(0, input.grossCents - retirement401k - healthPremium)

  // FICA taxable wages: gross minus Section 125 premiums only.
  // 401(k) contributions are FICA-taxable.
  const ficaWageCents = Math.max(0, input.grossCents - healthPremium)

  const federalCents = calculateFederal(federalWageCents, input.filingStatus, input.payPeriod, year)
  const ficaCents = calculateSocialSecurity(ficaWageCents, input.ytdCents, year)
  const medicareCents = calculateMedicare(ficaWageCents)
  const additionalMedicareCents = calculateAdditionalMedicare(ficaWageCents, input.ytdCents)
  const stateCents = calculateState(input)

  const taxCents = federalCents + ficaCents + medicareCents + additionalMedicareCents + stateCents
  const netCents = input.grossCents - taxCents - preTaxCents

  return {
    federalCents,
    ficaCents,
    medicareCents,
    additionalMedicareCents,
    stateCents,
    preTaxCents,
    taxCents,
    netCents,
  }
}
