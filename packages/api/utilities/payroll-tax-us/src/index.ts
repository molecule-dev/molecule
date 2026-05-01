/**
 * US payroll-tax calculator for molecule.dev.
 *
 * Pure-function library that turns a per-paycheck input record
 * (gross cents, filing status, pay frequency, year-to-date wages,
 * optional state + allowances + pre-tax deductions) into a fully
 * decomposed tax breakdown: federal income-tax withholding (IRS
 * Pub 15-T 2024 / 2025 brackets), FICA (Social Security with
 * annual wage cap), Medicare, Additional Medicare (0.9% over the
 * $200K per-employer threshold), and state withholding for six
 * representative states (CA, NY, TX, FL, IL, MA).
 *
 * Apps that need additional states can plug them in via
 * {@link registerStateCalculator} without forking the package.
 *
 * No I/O, no clock reads, no DB — every result is a pure function
 * of its input. All amounts are integer cents.
 *
 * Used by `payroll-manager` and any other app that runs US payroll.
 *
 * @example
 * ```ts
 * import { calculatePayrollTax } from '@molecule/api-payroll-tax-us'
 *
 * const result = calculatePayrollTax({
 *   grossCents: 5_000_00,
 *   filingStatus: 'single',
 *   payPeriod: 'biweekly',
 *   ytdCents: 0,
 *   state: 'CA',
 *   year: 2025,
 * })
 * // → { federalCents, ficaCents, medicareCents, ..., netCents }
 * ```
 *
 * @example
 * ```ts
 * import { registerStateCalculator } from '@molecule/api-payroll-tax-us'
 *
 * registerStateCalculator('OR', (input) => {
 *   // Oregon-specific withholding logic ...
 *   return 0
 * })
 * ```
 *
 * @remarks
 * Brackets are pinned per tax year. Each January's IRS / state
 * publication update requires a new package release that adds
 * the new year to `federal.ts`, `fica.ts`, and `state.ts`.
 *
 * @module
 */

export * from './calculate.js'
export * from './federal.js'
export * from './fica.js'
export * from './state.js'
export * from './types.js'
