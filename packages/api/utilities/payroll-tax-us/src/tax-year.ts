/**
 * Tax-year resolution and the single source of truth for which years
 * this package ships bracket / wage-cap / deduction tables for.
 *
 * Adding support for a new tax year is ONE edit here — append it to
 * {@link SUPPORTED_TAX_YEARS} — plus the matching table rows in
 * `federal.ts`, `fica.ts`, and `state.ts`. The {@link TaxYear} union is
 * derived from {@link SUPPORTED_TAX_YEARS}, so it can never drift from the
 * tables, and every year default flows through {@link resolveTaxYear}, so
 * no caller can ever silently compute against a year it did not intend.
 *
 * @module
 */

/**
 * The tax years this package ships tables for, in ascending order.
 *
 * SINGLE SOURCE OF TRUTH: {@link TaxYear} is derived from this and
 * {@link resolveTaxYear} / {@link isSupportedTaxYear} validate against it.
 * To add 2026, append `2026` here and add the matching rows to
 * `FEDERAL_BRACKETS` / `FEDERAL_STANDARD_DEDUCTION` (`federal.ts`),
 * `SS_WAGE_BASE_CENTS` (`fica.ts`), and any year-specific state schedules
 * (`state.ts`).
 */
export const SUPPORTED_TAX_YEARS = [2024, 2025] as const

/**
 * Tax-year selector. Brackets, wage caps, and standard deductions are
 * pinned per year; the union is derived from {@link SUPPORTED_TAX_YEARS}
 * so it can never drift from the shipped tables.
 */
export type TaxYear = (typeof SUPPORTED_TAX_YEARS)[number]

/**
 * Runtime type guard: does this package ship tables for `year`?
 *
 * @param year - Any calendar year.
 * @returns `true` (narrowing to {@link TaxYear}) when the year is supported.
 */
export function isSupportedTaxYear(year: number): year is TaxYear {
  return (SUPPORTED_TAX_YEARS as readonly number[]).includes(year)
}

/**
 * Resolve the tax year to use for a calculation.
 *
 * - **Omitted** (`undefined`): the CURRENT calendar year is detected
 *   (`new Date().getFullYear()`) and used — never a hardcoded past year.
 * - **Unsupported** (an omitted year in a calendar year with no tables, or
 *   an explicitly-passed unsupported year): THROWS a clear error naming the
 *   supported years, rather than silently computing against the wrong
 *   year's tables.
 *
 * This is the guarantee that a caller can never silently get numbers
 * computed from a different year than they intended.
 *
 * @param year - Explicit tax year, or `undefined` to use the current year.
 * @returns A supported {@link TaxYear}.
 * @throws {Error} When the resolved year has no tables in this package.
 */
export function resolveTaxYear(year?: number): TaxYear {
  const resolved = year ?? new Date().getFullYear()
  if (!isSupportedTaxYear(resolved)) {
    throw new Error(
      `@molecule/api-payroll-tax-us: no tax tables for ${resolved}; supported: ${SUPPORTED_TAX_YEARS.join(', ')}`,
    )
  }
  return resolved
}
