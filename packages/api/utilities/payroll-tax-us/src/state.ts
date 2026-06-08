/**
 * State income-tax withholding via a swappable registry.
 *
 * Six representative states ship out-of-the-box, covering the major
 * structural archetypes:
 *
 * - `CA` — progressive brackets with a state standard deduction (Method B / Exact-Calculation).
 * - `NY` — progressive brackets, single + married schedules.
 * - `TX` — no state income tax.
 * - `FL` — no state income tax.
 * - `IL` — flat tax (4.95%) with a per-allowance exemption.
 * - `MA` — flat tax (5.0%).
 *
 * Apps that need other states can call {@link registerStateCalculator}
 * to plug in their own pure-function withholding logic without forking
 * this package.
 *
 * All amounts are integer cents. Pure functions.
 *
 * @module
 */

import { annualise, applyBrackets, PERIODS_PER_YEAR } from './federal.js'
import type { FilingStatus, PayrollTaxInput, StateCalculator, TaxBracket } from './types.js'

/**
 * Compute the state-level taxable wage for this paycheck. Treats both
 * 401(k) and Section 125 health premiums as state-deductible — the
 * dominant rule across all 50 states; states that diverge (e.g. PA on
 * 401(k)) override this in their own calculator.
 *
 * @param input - The full payroll-tax input record.
 * @returns Per-paycheck state-taxable wage in integer cents.
 */
export function stateTaxableWageCents(input: PayrollTaxInput): number {
  const pre = input.preTax ?? {}
  const deductions = (pre.retirement401k ?? 0) + (pre.healthPremium ?? 0)
  return Math.max(0, input.grossCents - deductions)
}

/* ------------------------------------------------------------------ */
/* CA — California Method B (Exact-Calculation), 2025 schedules.       */
/* ------------------------------------------------------------------ */

/** CA 2025 standard deduction by filing status (cents). */
const CA_STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 5_540_00,
  'married-jointly': 11_080_00,
  'married-separately': 5_540_00,
  'head-of-household': 11_080_00,
}

/** CA 2025 annual brackets (Method B), single / MFS / HOH share schedule X. */
const CA_BRACKETS_SINGLE: TaxBracket[] = [
  { thresholdCents: 0, rate: 0.011 },
  { thresholdCents: 11_257_00, rate: 0.022 },
  { thresholdCents: 26_691_00, rate: 0.044 },
  { thresholdCents: 42_127_00, rate: 0.066 },
  { thresholdCents: 58_485_00, rate: 0.088 },
  { thresholdCents: 73_926_00, rate: 0.1023 },
  { thresholdCents: 377_252_00, rate: 0.1133 },
  { thresholdCents: 452_704_00, rate: 0.1243 },
  { thresholdCents: 754_504_00, rate: 0.1353 },
  { thresholdCents: 1_259_173_00, rate: 0.1463 },
]

const CA_BRACKETS_MFJ: TaxBracket[] = [
  { thresholdCents: 0, rate: 0.011 },
  { thresholdCents: 22_514_00, rate: 0.022 },
  { thresholdCents: 53_382_00, rate: 0.044 },
  { thresholdCents: 84_254_00, rate: 0.066 },
  { thresholdCents: 116_970_00, rate: 0.088 },
  { thresholdCents: 147_852_00, rate: 0.1023 },
  { thresholdCents: 754_504_00, rate: 0.1133 },
  { thresholdCents: 905_408_00, rate: 0.1243 },
  { thresholdCents: 1_509_008_00, rate: 0.1353 },
  { thresholdCents: 2_518_346_00, rate: 0.1463 },
]

/**
 * Compute California state income-tax withholding using Method B (Exact-Calculation), 2025 schedules.
 */
function caCalculator(input: PayrollTaxInput): number {
  const taxable = stateTaxableWageCents(input)
  if (taxable <= 0) return 0
  const annual = annualise(taxable, input.payPeriod)
  const status = input.filingStatus
  const sd = CA_STANDARD_DEDUCTION[status]
  const brackets = status === 'married-jointly' ? CA_BRACKETS_MFJ : CA_BRACKETS_SINGLE
  const afterDeduction = Math.max(0, annual - sd)
  const annualTax = applyBrackets(afterDeduction, brackets)
  return Math.max(0, Math.round(annualTax / PERIODS_PER_YEAR[input.payPeriod]))
}

/* ------------------------------------------------------------------ */
/* NY — New York State 2025 Publication NYS-50-T-NYS schedules.        */
/* ------------------------------------------------------------------ */

/** NY 2025 annual brackets — single. */
const NY_BRACKETS_SINGLE: TaxBracket[] = [
  { thresholdCents: 0, rate: 0.04 },
  { thresholdCents: 8_500_00, rate: 0.045 },
  { thresholdCents: 11_700_00, rate: 0.0525 },
  { thresholdCents: 13_900_00, rate: 0.055 },
  { thresholdCents: 80_650_00, rate: 0.06 },
  { thresholdCents: 215_400_00, rate: 0.0685 },
  { thresholdCents: 1_077_550_00, rate: 0.0965 },
  { thresholdCents: 5_000_000_00, rate: 0.103 },
  { thresholdCents: 25_000_000_00, rate: 0.109 },
]

/** NY 2025 annual brackets — married filing jointly. */
const NY_BRACKETS_MFJ: TaxBracket[] = [
  { thresholdCents: 0, rate: 0.04 },
  { thresholdCents: 17_150_00, rate: 0.045 },
  { thresholdCents: 23_600_00, rate: 0.0525 },
  { thresholdCents: 27_900_00, rate: 0.055 },
  { thresholdCents: 161_550_00, rate: 0.06 },
  { thresholdCents: 323_200_00, rate: 0.0685 },
  { thresholdCents: 2_155_350_00, rate: 0.0965 },
  { thresholdCents: 5_000_000_00, rate: 0.103 },
  { thresholdCents: 25_000_000_00, rate: 0.109 },
]

/**
 * Compute New York State income-tax withholding using 2025 Publication NYS-50-T-NYS schedules.
 */
function nyCalculator(input: PayrollTaxInput): number {
  const taxable = stateTaxableWageCents(input)
  if (taxable <= 0) return 0
  const annual = annualise(taxable, input.payPeriod)
  const brackets = input.filingStatus === 'married-jointly' ? NY_BRACKETS_MFJ : NY_BRACKETS_SINGLE
  const annualTax = applyBrackets(annual, brackets)
  return Math.max(0, Math.round(annualTax / PERIODS_PER_YEAR[input.payPeriod]))
}

/* ------------------------------------------------------------------ */
/* IL — flat 4.95% with $2,775 / allowance personal exemption (2025).  */
/* ------------------------------------------------------------------ */

const IL_RATE = 0.0495
const IL_PERSONAL_EXEMPTION_CENTS = 2_775_00 // per allowance, annual

/**
 * Compute Illinois state income-tax withholding at the flat 4.95% rate with per-allowance personal exemptions, 2025.
 */
function ilCalculator(input: PayrollTaxInput): number {
  const taxable = stateTaxableWageCents(input)
  if (taxable <= 0) return 0
  const annual = annualise(taxable, input.payPeriod)
  const allowances = Math.max(0, input.stateAllowances ?? 0)
  const exemption = allowances * IL_PERSONAL_EXEMPTION_CENTS
  const afterExemption = Math.max(0, annual - exemption)
  const annualTax = afterExemption * IL_RATE
  return Math.max(0, Math.round(annualTax / PERIODS_PER_YEAR[input.payPeriod]))
}

/* ------------------------------------------------------------------ */
/* MA — flat 5.0% on Massachusetts-source wages (2025).                */
/* ------------------------------------------------------------------ */

const MA_RATE = 0.05

/**
 * Compute Massachusetts state income-tax withholding at the flat 5.0% rate on Massachusetts-source wages, 2025.
 */
function maCalculator(input: PayrollTaxInput): number {
  const taxable = stateTaxableWageCents(input)
  if (taxable <= 0) return 0
  return Math.max(0, Math.round(taxable * MA_RATE))
}

/* ------------------------------------------------------------------ */
/* TX, FL — no state income tax.                                       */
/* ------------------------------------------------------------------ */

/**
 * No-op calculator for states with no state income tax (TX, FL); always returns 0.
 */
function noTaxCalculator(): number {
  return 0
}

/* ------------------------------------------------------------------ */
/* Registry.                                                           */
/* ------------------------------------------------------------------ */

const STATE_CALCULATORS = new Map<string, StateCalculator>([
  ['CA', caCalculator],
  ['NY', nyCalculator],
  ['TX', noTaxCalculator],
  ['FL', noTaxCalculator],
  ['IL', ilCalculator],
  ['MA', maCalculator],
])

/**
 * Look up a per-state calculator by 2-letter code (case-insensitive).
 * Returns `undefined` when no calculator is registered.
 *
 * @param state - 2-letter state code.
 * @returns The registered calculator, or `undefined`.
 */
export function getStateCalculator(state: string): StateCalculator | undefined {
  return STATE_CALCULATORS.get(state.toUpperCase())
}

/**
 * Register (or override) a state calculator. Use this from app code
 * to add states beyond the six built-ins, or to swap the built-in
 * formula for an updated one.
 *
 * @param state - 2-letter state code (case-insensitive — stored uppercased).
 * @param fn - Pure calculator function returning per-period withholding in cents.
 */
export function registerStateCalculator(state: string, fn: StateCalculator): void {
  STATE_CALCULATORS.set(state.toUpperCase(), fn)
}

/**
 * Remove a state calculator from the registry. Primarily useful for
 * tests that want to assert the "unsupported state" code path.
 *
 * @param state - 2-letter state code.
 */
export function unregisterStateCalculator(state: string): void {
  STATE_CALCULATORS.delete(state.toUpperCase())
}

/**
 * Compute the state withholding for a single paycheck. Returns 0
 * when no state is supplied or no calculator is registered for the
 * given state.
 *
 * @param input - Payroll-tax input record.
 * @returns State withholding in integer cents.
 */
export function calculateState(input: PayrollTaxInput): number {
  if (!input.state) return 0
  const fn = getStateCalculator(input.state)
  if (!fn) return 0
  return Math.max(0, Math.round(fn(input)))
}
