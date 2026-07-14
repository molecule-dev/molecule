/**
 * Spreadsheet-style formula engine for molecule.dev.
 *
 * Pure-function parser + evaluator + dependency tracker for
 * A1-notation formulas (`=SUM(A1:B5)`, `=IF(A1>0, "y", "n")`, etc.).
 * Designed for the spreadsheet flagship app and for ad-hoc line-item
 * math (e.g. invoice/billing computed columns).
 *
 * Capabilities:
 * - **Arithmetic**: `+ - * / % ^` (with Excel-compatible coercions).
 * - **Comparison**: `= <> < <= > >=` (numbers, strings, dates, booleans).
 * - **String**: `&` and `CONCAT()` / `CONCATENATE()`.
 * - **References**: `A1`, `$A$1`, `BC42`, ranges `A1:B5`.
 * - **Aggregations**: `SUM`, `AVERAGE`/`AVG`, `MIN`, `MAX`, `COUNT`,
 *   `COUNTA`, `COUNTIF`, `SUMIF`.
 * - **Conditionals**: `IF`, `AND`, `OR`, `NOT`, `IFS`, `SWITCH`,
 *   `IFERROR`, `ISERROR`, `ISNUMBER`, `ISBLANK`.
 * - **Math**: `ROUND`, `ABS`, `MOD`, `POWER`, `SQRT`, `INT`, `CEILING`,
 *   `FLOOR`.
 * - **Dates**: `DATE`, `TODAY`, `NOW`, `YEAR`, `MONTH`, `DAY`,
 *   `DATEDIFF`/`DATEDIF` (units: D/M/Y/H/MIN/S).
 * - **Text**: `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `UPPER`, `LOWER`,
 *   `SUBSTITUTE`.
 * - **Errors**: `#DIV/0!`, `#VALUE!`, `#REF!`, `#NAME?`, `#NUM!`,
 *   `#N/A`, plus engine-emitted `#CIRC!` for circular references.
 *
 * The `Sheet` class wraps the lower-level helpers and provides
 * incremental recompute (only the transitive dependents of a changed
 * cell are re-evaluated). Use `parseFormula` + `evaluate` directly for
 * stateless one-shot math.
 *
 * Pure functions, zero I/O, zero DB access, zero hardcoded UI text.
 *
 * @example
 * ```typescript
 * import { Sheet, parseFormula, evaluate } from '@molecule/api-formula-engine'
 *
 * // Stateful: a small in-memory spreadsheet.
 * const sheet = new Sheet()
 * sheet.setValue('A1', 10)
 * sheet.setValue('A2', 20)
 * sheet.setFormula('A3', '=SUM(A1:A2)')
 * sheet.getValue('A3') // → 30
 *
 * sheet.setValue('A1', 100)
 * sheet.getValue('A3') // → 120 (auto-recomputed)
 *
 * // Stateless: ad-hoc evaluation against a lookup function.
 * const ast = parseFormula('=A1 * 1.0875')
 * const lineTotal = evaluate(ast, (coord) =>
 *   coord.col === 0 && coord.row === 0 ? 49.99 : null,
 * )
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './dependencies.js'
export * from './evaluator.js'
export * from './functions.js'
export * from './parser.js'
export * from './references.js'
export * from './sheet.js'
export * from './tokenizer.js'
export * from './types.js'
export * from './values.js'
