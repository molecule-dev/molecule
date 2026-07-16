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
 * Supported tax years: 2024 and 2025 only (the `TaxYear` union). `year`
 * DEFAULTS to 2025 — there is no current-date detection, so from calendar
 * 2026 onward an omitted `year` silently computes with 2025 tables. Passing
 * an unsupported year is a compile-time error; there is no runtime fallback.
 * Brackets are pinned per tax year: each January's IRS / state publication
 * update requires a package release that adds the new year to `federal.ts`,
 * `fica.ts`, and `state.ts` — check that the year you need exists before
 * shipping payroll math.
 *
 * Scope: withholding ESTIMATES via the IRS Pub 15-T percentage method plus
 * simplified state schedules (CA and NY progressive brackets; IL and MA
 * flat; TX and FL zero income tax). Local/city taxes, SDI/SUI, and W-4
 * step-level adjustments are not modeled — treat results as
 * preview/planning figures, not filed-payroll-grade numbers.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './calculate.js'
export * from './federal.js'
export * from './fica.js'
export * from './state.js'
export * from './types.js'
