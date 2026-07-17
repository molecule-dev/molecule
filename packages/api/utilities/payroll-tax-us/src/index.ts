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
 * No DB, no network — every result is a function of its input, with
 * one exception: when `year` is omitted the current calendar year is read
 * (`new Date()`) to select the tax tables. Pass an explicit `year` for a
 * fully deterministic result. All amounts are integer cents.
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
 * Supported tax years: 2024 and 2025 only ({@link SUPPORTED_TAX_YEARS}, the
 * single source of truth the `TaxYear` union is derived from). When `year`
 * is OMITTED the current calendar year is detected and used — it is NEVER
 * silently defaulted to a hardcoded past year. If the resolved year has no
 * tables (an omitted `year` in calendar 2026+, or an unsupported explicit
 * year), the calculator THROWS a clear error naming the supported years
 * (via {@link resolveTaxYear}) instead of returning numbers computed from
 * the wrong year. Brackets are pinned per tax year: each January's IRS /
 * state publication update requires a package release that appends the new
 * year to {@link SUPPORTED_TAX_YEARS} and adds the matching rows in
 * `federal.ts`, `fica.ts`, and `state.ts`.
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
export * from './tax-year.js'
export * from './types.js'
