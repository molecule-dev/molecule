# @molecule/api-payroll-tax-us

US payroll-tax calculator for molecule.dev.

Pure-function library that turns a per-paycheck input record
(gross cents, filing status, pay frequency, year-to-date wages,
optional state + allowances + pre-tax deductions) into a fully
decomposed tax breakdown: federal income-tax withholding (IRS
Pub 15-T 2024 / 2025 brackets), FICA (Social Security with
annual wage cap), Medicare, Additional Medicare (0.9% over the
$200K per-employer threshold), and state withholding for six
representative states (CA, NY, TX, FL, IL, MA).

Apps that need additional states can plug them in via
{@link registerStateCalculator} without forking the package.

No DB, no network — every result is a function of its input, with
one exception: when `year` is omitted the current calendar year is read
(`new Date()`) to select the tax tables. Pass an explicit `year` for a
fully deterministic result. All amounts are integer cents.

Used by `payroll-manager` and any other app that runs US payroll.

## Quick Start

```ts
import { calculatePayrollTax } from '@molecule/api-payroll-tax-us'

const result = calculatePayrollTax({
  grossCents: 5_000_00,
  filingStatus: 'single',
  payPeriod: 'biweekly',
  ytdCents: 0,
  state: 'CA',
  year: 2025,
})
// → { federalCents, ficaCents, medicareCents, ..., netCents }
```

```ts
import { registerStateCalculator } from '@molecule/api-payroll-tax-us'

registerStateCalculator('OR', (input) => {
  // Oregon-specific withholding logic ...
  return 0
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-payroll-tax-us
```

## API

### Interfaces

#### `PayrollTaxInput`

Single-paycheck input to {@link calculatePayrollTax}.

```typescript
interface PayrollTaxInput {
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
   * Tax year for bracket / wage-cap lookup. Omit to use the current
   * calendar year. Only years in `SUPPORTED_TAX_YEARS` have tables — an
   * omitted year whose current calendar year is unsupported, or an
   * unsupported explicit year, THROWS rather than silently using stale
   * tables (see {@link resolveTaxYear}).
   */
  year?: TaxYear
}
```

#### `PayrollTaxResult`

Per-paycheck tax breakdown returned by {@link calculatePayrollTax}.

All amounts are integer cents; `netCents = grossCents - sum-of-taxes - preTax`.

```typescript
interface PayrollTaxResult {
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
```

#### `PreTaxDeductions`

Pre-tax deduction categories that reduce wages BEFORE federal
income-tax withholding (and, where applicable, FICA / state).

- `retirement401k` — 401(k) / 403(b) contributions. Reduces
  federal + state taxable wages. Does NOT reduce FICA wages.
- `healthPremium` — Section 125 / cafeteria-plan health
  premiums. Reduces federal + FICA + state taxable wages.

All amounts are integer cents.

```typescript
interface PreTaxDeductions {
  retirement401k?: number
  healthPremium?: number
}
```

#### `TaxBracket`

A federal-tax bracket: marginal rate applied to wages above
`thresholdCents` and up to (but not including) the next bracket.
The final bracket has no upper bound.

```typescript
interface TaxBracket {
  thresholdCents: number
  rate: number
}
```

### Types

#### `FilingStatus`

Federal filing-status codes used for income-tax withholding lookups.

- `single` — unmarried filer.
- `married-jointly` — married filing jointly (or qualifying surviving spouse).
- `married-separately` — married filing separately.
- `head-of-household` — single with qualifying dependents.

```typescript
type FilingStatus = 'single' | 'married-jointly' | 'married-separately' | 'head-of-household'
```

#### `PayPeriod`

Pay frequency. Used to annualise gross pay before applying
annual federal/state brackets, and to deannualise the resulting
tax back to a per-paycheck withholding amount.

```typescript
type PayPeriod = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annual'
```

#### `StateCalculator`

Per-state withholding calculator. Receives the same input record as
the top-level calculator and returns withholding in integer cents.

Implementations should derive their own taxable-wage base from
`grossCents` and `preTax` — pre-tax-401(k) and Section 125 health
premiums are state-deductible in the vast majority of states.

```typescript
type StateCalculator = (input: PayrollTaxInput) => number
```

#### `TaxYear`

Tax-year selector. Brackets, wage caps, and standard deductions are
pinned per year; the union is derived from {@link SUPPORTED_TAX_YEARS}
so it can never drift from the shipped tables.

```typescript
type TaxYear = (typeof SUPPORTED_TAX_YEARS)[number]
```

### Functions

#### `annualise(wageCents, period)`

Annualise a per-period wage to its yearly equivalent.

```typescript
function annualise(wageCents: number, period: PayPeriod): number
```

- `wageCents` — Per-paycheck wage in cents.
- `period` — Pay frequency.

**Returns:** Annualised wage in cents.

#### `applyBrackets(taxableAnnualCents, brackets)`

Apply progressive tax brackets to an annualised taxable wage.

```typescript
function applyBrackets(taxableAnnualCents: number, brackets: TaxBracket[]): number
```

- `taxableAnnualCents` — Taxable annual wage in cents.
- `brackets` — Bracket table (sorted ascending by threshold).

**Returns:** Annual tax in cents.

#### `calculateAdditionalMedicare(ficaWageCents, ytdCents)`

Compute the Additional Medicare Tax (0.9%) withholding for a single
paycheck, applying the per-employer $200,000 YTD threshold.

```typescript
function calculateAdditionalMedicare(ficaWageCents: number, ytdCents: number): number
```

- `ficaWageCents` — FICA-taxable wages for this paycheck.
- `ytdCents` — Year-to-date FICA-eligible wages already paid (pre this paycheck).

**Returns:** Additional Medicare tax withheld this period, in integer cents.

#### `calculateFederal(taxableCents, filingStatus, period, year)`

Compute the federal income-tax withholding for a single paycheck
using the IRS Pub 15-T annualised wage-bracket method.

```typescript
function calculateFederal(taxableCents: number, filingStatus: FilingStatus, period: PayPeriod, year?: 2024 | 2025): number
```

- `taxableCents` — Per-paycheck federal-taxable wages (gross minus pre-tax deductions).
- `filingStatus` — Federal filing status.
- `period` — Pay frequency.
- `year` — Tax year. Omit to use the current calendar year; an unsupported year (omitted or explicit) throws — see {@link resolveTaxYear}.

**Returns:** Federal withholding for this paycheck in integer cents.

#### `calculateMedicare(ficaWageCents)`

Compute the regular (1.45%) Medicare tax withholding for a single paycheck.

```typescript
function calculateMedicare(ficaWageCents: number): number
```

- `ficaWageCents` — FICA-taxable wages for this paycheck.

**Returns:** Medicare tax withheld this period, in integer cents.

#### `calculatePayrollTax(input)`

Compute the per-paycheck tax breakdown for a US W-2 employee.

Pre-tax handling:
- 401(k) contributions reduce federal + state taxable wages but NOT FICA wages.
- Section 125 health premiums reduce federal + FICA + state taxable wages.

```typescript
function calculatePayrollTax(input: PayrollTaxInput): PayrollTaxResult
```

- `input` — Per-paycheck input record. See {@link PayrollTaxInput}.

**Returns:** Per-paycheck breakdown including a `netCents` take-home figure.

#### `calculateSocialSecurity(ficaWageCents, ytdCents, year)`

Compute the Social Security tax withholding for a single paycheck.

```typescript
function calculateSocialSecurity(ficaWageCents: number, ytdCents: number, year?: 2024 | 2025): number
```

- `ficaWageCents` — FICA-taxable wages for this paycheck (post-Section-125, but pre-401k).
- `ytdCents` — Year-to-date FICA-eligible wages already paid (pre this paycheck).
- `year` — Tax year selector. Omit to use the current calendar year; an unsupported year (omitted or explicit) throws — see {@link resolveTaxYear}.

**Returns:** Social Security tax withheld this period, in integer cents.

#### `calculateState(input)`

Compute the state withholding for a single paycheck. Returns 0
when no state is supplied or no calculator is registered for the
given state.

```typescript
function calculateState(input: PayrollTaxInput): number
```

- `input` — Payroll-tax input record.

**Returns:** State withholding in integer cents.

#### `getStateCalculator(state)`

Look up a per-state calculator by 2-letter code (case-insensitive).
Returns `undefined` when no calculator is registered.

```typescript
function getStateCalculator(state: string): StateCalculator | undefined
```

- `state` — 2-letter state code.

**Returns:** The registered calculator, or `undefined`.

#### `isSupportedTaxYear(year)`

Runtime type guard: does this package ship tables for `year`?

```typescript
function isSupportedTaxYear(year: number): boolean
```

- `year` — Any calendar year.

**Returns:** `true` (narrowing to {@link TaxYear}) when the year is supported.

#### `registerStateCalculator(state, fn)`

Register (or override) a state calculator. Use this from app code
to add states beyond the six built-ins, or to swap the built-in
formula for an updated one.

```typescript
function registerStateCalculator(state: string, fn: StateCalculator): void
```

- `state` — 2-letter state code (case-insensitive — stored uppercased).
- `fn` — Pure calculator function returning per-period withholding in cents.

#### `resolveTaxYear(year)`

Resolve the tax year to use for a calculation.

- **Omitted** (`undefined`): the CURRENT calendar year is detected
  (`new Date().getFullYear()`) and used — never a hardcoded past year.
- **Unsupported** (an omitted year in a calendar year with no tables, or
  an explicitly-passed unsupported year): THROWS a clear error naming the
  supported years, rather than silently computing against the wrong
  year's tables.

This is the guarantee that a caller can never silently get numbers
computed from a different year than they intended.

```typescript
function resolveTaxYear(year?: number): 2024 | 2025
```

- `year` — Explicit tax year, or `undefined` to use the current year.

**Returns:** A supported {@link TaxYear}.

#### `stateTaxableWageCents(input)`

Compute the state-level taxable wage for this paycheck. Treats both
401(k) and Section 125 health premiums as state-deductible — the
dominant rule across all 50 states; states that diverge (e.g. PA on
401(k)) override this in their own calculator.

```typescript
function stateTaxableWageCents(input: PayrollTaxInput): number
```

- `input` — The full payroll-tax input record.

**Returns:** Per-paycheck state-taxable wage in integer cents.

#### `unregisterStateCalculator(state)`

Remove a state calculator from the registry. Primarily useful for
tests that want to assert the "unsupported state" code path.

```typescript
function unregisterStateCalculator(state: string): void
```

- `state` — 2-letter state code.

### Constants

#### `ADDITIONAL_MEDICARE_FILING_THRESHOLD_CENTS`

Annual filing-status thresholds for the employee's own Additional
Medicare reconciliation. Exposed for test parity and for callers
that want to compute the year-end true-up amount.

```typescript
const ADDITIONAL_MEDICARE_FILING_THRESHOLD_CENTS: Record<FilingStatus, number>
```

#### `FEDERAL_BRACKETS`

Federal annualised withholding brackets per IRS Pub 15-T.

Each bracket entry is `[thresholdCents, marginalRate]`. The first
bracket starts at the post-standard-deduction taxable wage of $0;
the standard deduction is applied separately via
{@link FEDERAL_STANDARD_DEDUCTION}.

Sourced from IRS Pub 15-T (2024 and 2025), "Annual Payroll Period —
Standard withholding" tables for Form W-4 from 2020 or later.

```typescript
const FEDERAL_BRACKETS: Record<2024 | 2025, Record<FilingStatus, TaxBracket[]>>
```

#### `FEDERAL_STANDARD_DEDUCTION`

Standard deduction (already baked into the Pub 15-T bracket
thresholds above). We expose it for callers that want to reason
about pre-deduction taxable wages — but {@link calculateFederal}
does NOT subtract it, since the brackets already account for it.

```typescript
const FEDERAL_STANDARD_DEDUCTION: Record<2024 | 2025, Record<FilingStatus, number>>
```

#### `PERIODS_PER_YEAR`

Pay-period multipliers used to annualise per-paycheck wages.
The "annual" period is its own identity (no scaling).

```typescript
const PERIODS_PER_YEAR: Record<PayPeriod, number>
```

#### `SUPPORTED_TAX_YEARS`

The tax years this package ships tables for, in ascending order.

SINGLE SOURCE OF TRUTH: {@link TaxYear} is derived from this and
{@link resolveTaxYear} / {@link isSupportedTaxYear} validate against it.
To add 2026, append `2026` here and add the matching rows to
`FEDERAL_BRACKETS` / `FEDERAL_STANDARD_DEDUCTION` (`federal.ts`),
`SS_WAGE_BASE_CENTS` (`fica.ts`), and any year-specific state schedules
(`state.ts`).

```typescript
const SUPPORTED_TAX_YEARS: readonly [2024, 2025]
```

## Injection Notes

Supported tax years: 2024 and 2025 only ({@link SUPPORTED_TAX_YEARS}, the
single source of truth the `TaxYear` union is derived from). When `year`
is OMITTED the current calendar year is detected and used — it is NEVER
silently defaulted to a hardcoded past year. If the resolved year has no
tables (an omitted `year` in calendar 2026+, or an unsupported explicit
year), the calculator THROWS a clear error naming the supported years
(via {@link resolveTaxYear}) instead of returning numbers computed from
the wrong year. Brackets are pinned per tax year: each January's IRS /
state publication update requires a package release that appends the new
year to {@link SUPPORTED_TAX_YEARS} and adds the matching rows in
`federal.ts`, `fica.ts`, and `state.ts`.

Scope: withholding ESTIMATES via the IRS Pub 15-T percentage method plus
simplified state schedules (CA and NY progressive brackets; IL and MA
flat; TX and FL zero income tax). Local/city taxes, SDI/SUI, and W-4
step-level adjustments are not modeled — treat results as
preview/planning figures, not filed-payroll-grade numbers.
