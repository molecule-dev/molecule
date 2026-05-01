/**
 * Type definitions for the US payroll-tax calculator.
 *
 * All amounts are integer cents (no floating-point drift). All
 * functions in this package are pure: given an input record, they
 * return a deterministic breakdown — no I/O, no clock reads.
 *
 * @module
 */

/**
 * Federal filing-status codes used for income-tax withholding lookups.
 *
 * - `single` — unmarried filer.
 * - `married-jointly` — married filing jointly (or qualifying surviving spouse).
 * - `married-separately` — married filing separately.
 * - `head-of-household` — single with qualifying dependents.
 */
export type FilingStatus = 'single' | 'married-jointly' | 'married-separately' | 'head-of-household'

/**
 * Pay frequency. Used to annualise gross pay before applying
 * annual federal/state brackets, and to deannualise the resulting
 * tax back to a per-paycheck withholding amount.
 */
export type PayPeriod = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annual'

/**
 * Tax-year selector. Brackets, wage caps, and standard deductions
 * are pinned per year; future years are added by extending the
 * tables in `federal.ts` / `fica.ts` / `state.ts`.
 */
export type TaxYear = 2024 | 2025

/**
 * Pre-tax deduction categories that reduce wages BEFORE federal
 * income-tax withholding (and, where applicable, FICA / state).
 *
 * - `retirement401k` — 401(k) / 403(b) contributions. Reduces
 *   federal + state taxable wages. Does NOT reduce FICA wages.
 * - `healthPremium` — Section 125 / cafeteria-plan health
 *   premiums. Reduces federal + FICA + state taxable wages.
 *
 * All amounts are integer cents.
 */
export interface PreTaxDeductions {
  retirement401k?: number
  healthPremium?: number
}

/**
 * Single-paycheck input to {@link calculatePayrollTax}.
 */
export interface PayrollTaxInput {
  /** Gross pay for this period, in integer cents. */
  grossCents: number
  /** Federal filing status. */
  filingStatus: FilingStatus
  /** Pay period; the gross is annualised based on this. */
  payPeriod: PayPeriod
  /**
   * Year-to-date FICA-eligible wages already paid in the current
   * calendar year, in integer cents. Used to apply the Social
   * Security wage cap and the Additional Medicare Tax threshold.
   */
  ytdCents: number
  /** Two-letter state code (uppercase). Optional — defaults to no state tax. */
  state?: string
  /**
   * State withholding allowances / dependents — passed through to
   * the per-state calculator. Interpretation is state-specific.
   */
  stateAllowances?: number
  /**
   * Pre-tax deductions for this paycheck. All amounts in cents.
   */
  preTax?: PreTaxDeductions
  /**
   * Tax year for bracket / wage-cap lookup. Defaults to 2025.
   */
  year?: TaxYear
}

/**
 * Per-paycheck tax breakdown returned by {@link calculatePayrollTax}.
 *
 * All amounts are integer cents; `netCents = grossCents - sum-of-taxes - preTax`.
 */
export interface PayrollTaxResult {
  /** Federal income-tax withholding for the period. */
  federalCents: number
  /** Social Security tax (employee share, 6.2% up to wage cap). */
  ficaCents: number
  /** Regular Medicare tax (employee share, 1.45% — no cap). */
  medicareCents: number
  /** Additional Medicare Tax (0.9%) on YTD wages above filing-status threshold. */
  additionalMedicareCents: number
  /** State income-tax withholding (0 when state omitted or unsupported). */
  stateCents: number
  /** Take-home: `grossCents - all taxes - all preTax deductions`. */
  netCents: number
  /** Total of all pre-tax deductions applied this period. */
  preTaxCents: number
  /** Total of all taxes withheld this period. */
  taxCents: number
}

/**
 * Per-state withholding calculator. Receives the same input record as
 * the top-level calculator and returns withholding in integer cents.
 *
 * Implementations should derive their own taxable-wage base from
 * `grossCents` and `preTax` — pre-tax-401(k) and Section 125 health
 * premiums are state-deductible in the vast majority of states.
 */
export type StateCalculator = (input: PayrollTaxInput) => number

/**
 * A federal-tax bracket: marginal rate applied to wages above
 * `thresholdCents` and up to (but not including) the next bracket.
 * The final bracket has no upper bound.
 */
export interface TaxBracket {
  thresholdCents: number
  rate: number
}
