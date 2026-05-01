/**
 * Value coercion + error helpers shared by the evaluator and built-in
 * function implementations.
 *
 * @module
 */

import type { CellValue, FormulaError, FormulaErrorCode } from './types.js'

/**
 * Construct a `FormulaError` value.
 *
 * @param code - Error code.
 * @param message - Optional human-readable description.
 * @returns The error value.
 */
export function makeError(code: FormulaErrorCode, message?: string): FormulaError {
  return message === undefined ? { type: 'error', code } : { type: 'error', code, message }
}

/**
 * Type-guard for `FormulaError`.
 *
 * @param value - Cell value to inspect.
 * @returns `true` if the value is a propagating error.
 */
export function isError(value: unknown): value is FormulaError {
  return (
    typeof value === 'object' && value !== null && (value as { type?: string }).type === 'error'
  )
}

/**
 * Returns the first error encountered in a flat list, or `null` if none.
 *
 * @param values - Cell values to scan.
 * @returns The first error value, or `null`.
 */
export function firstError(values: ReadonlyArray<CellValue>): FormulaError | null {
  for (const v of values) {
    if (isError(v)) return v
  }
  return null
}

/**
 * Coerce a cell value to a number (Excel-compatible).
 *
 * - `null` → 0
 * - boolean → 0/1
 * - `Date` → days since 1899-12-30 (Excel's epoch)
 * - string → parsed as number, `#VALUE!` if not parseable
 * - error → propagated unchanged
 *
 * @param value - Cell value.
 * @returns Number, or `FormulaError` on failure.
 */
export function toNumber(value: CellValue): number | FormulaError {
  if (isError(value)) return value
  if (value === null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value instanceof Date) return dateToSerial(value)
  if (typeof value === 'string') {
    if (value.trim() === '') return 0
    const n = Number(value)
    if (Number.isFinite(n)) return n
    return makeError('#VALUE!', `Cannot coerce "${value}" to number`)
  }
  return makeError('#VALUE!')
}

/**
 * Coerce a cell value to a string for display / `&` concatenation.
 *
 * @param value - Cell value.
 * @returns String, or `FormulaError` for propagating errors.
 */
export function toStringValue(value: CellValue): string | FormulaError {
  if (isError(value)) return value
  if (value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return makeError('#NUM!')
    return String(value)
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (value instanceof Date) return value.toISOString()
  return makeError('#VALUE!')
}

/**
 * Coerce a cell value to a boolean (Excel-compatible).
 *
 * @param value - Cell value.
 * @returns Boolean, or `FormulaError` on failure.
 */
export function toBoolean(value: CellValue): boolean | FormulaError {
  if (isError(value)) return value
  if (typeof value === 'boolean') return value
  if (value === null) return false
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const u = value.toUpperCase().trim()
    if (u === 'TRUE') return true
    if (u === 'FALSE') return false
    return makeError('#VALUE!', `Cannot coerce "${value}" to boolean`)
  }
  return makeError('#VALUE!')
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86_400_000

/**
 * Convert a `Date` to an Excel serial number (days since 1899-12-30).
 *
 * @param date - Date instance.
 * @returns Excel serial date.
 */
export function dateToSerial(date: Date): number {
  return (date.getTime() - EXCEL_EPOCH) / MS_PER_DAY
}

/**
 * Convert an Excel serial number to a `Date` (UTC).
 *
 * @param serial - Excel serial date.
 * @returns Date instance.
 */
export function serialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH + serial * MS_PER_DAY)
}

/**
 * Compare two scalar cell values (Excel ordering: number < string,
 * boolean compared as 0/1 within numbers).
 *
 * @param left - Left operand.
 * @param right - Right operand.
 * @returns -1, 0, 1, or `FormulaError` if uncomparable.
 */
export function compareValues(left: CellValue, right: CellValue): number | FormulaError {
  if (isError(left)) return left
  if (isError(right)) return right
  // null normalizes to 0 / "" depending on the other side
  if (typeof left === 'number' || typeof left === 'boolean' || left === null) {
    const ln = toNumber(left)
    if (isError(ln)) return ln
    if (typeof right === 'string') {
      // Excel: numbers always sort before strings
      return -1
    }
    const rn = toNumber(right)
    if (isError(rn)) return rn
    return ln === rn ? 0 : ln < rn ? -1 : 1
  }
  if (left instanceof Date) {
    const ln = dateToSerial(left)
    const rn = toNumber(right)
    if (isError(rn)) return rn
    return ln === rn ? 0 : ln < rn ? -1 : 1
  }
  if (typeof left === 'string') {
    if (typeof right === 'number' || typeof right === 'boolean' || right === null) {
      return 1
    }
    if (right instanceof Date) {
      return 1
    }
    if (typeof right === 'string') {
      // Case-insensitive comparison, like Excel.
      const a = left.toUpperCase()
      const b = right.toUpperCase()
      return a === b ? 0 : a < b ? -1 : 1
    }
  }
  return makeError('#VALUE!')
}
