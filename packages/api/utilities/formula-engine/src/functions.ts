/**
 * Built-in function registry.
 *
 * Each entry is a pure function: given a list of evaluated argument
 * values (scalars or expanded ranges), returns a `CellValue`.
 *
 * Implements: SUM, AVERAGE/AVG, MIN, MAX, COUNT, COUNTA, COUNTIF,
 * SUMIF, IF, AND, OR, NOT, IFS, SWITCH, IFERROR, ISERROR, ISNUMBER,
 * ISBLANK, CONCAT/CONCATENATE, LEFT, RIGHT, MID, LEN, TRIM, UPPER,
 * LOWER, SUBSTITUTE, ROUND, ABS, MOD, POWER, SQRT, INT, CEILING,
 * FLOOR, DATE, TODAY, NOW, YEAR, MONTH, DAY, DATEDIF / DATEDIFF.
 *
 * @module
 */

import type { CellValue, FormulaFunction, FunctionContext } from './types.js'
import {
  compareValues,
  dateToSerial,
  firstError,
  isError,
  makeError,
  serialToDate,
  toBoolean,
  toNumber,
  toStringValue,
} from './values.js'

/**
 * Flatten an argument value: ranges arrive as arrays, scalars stay as
 * scalars. Always returns a flat `CellValue[]`.
 *
 * @param arg - Either a scalar `CellValue` or an array (range).
 * @returns Flat list of cell values.
 */
function flatten(arg: CellValue | ReadonlyArray<CellValue>): CellValue[] {
  if (Array.isArray(arg)) return [...arg]
  return [arg as CellValue]
}

/**
 * Flatten all argument values (scalars and ranges) into a single `CellValue[]`.
 */
function flattenAll(args: ReadonlyArray<CellValue | ReadonlyArray<CellValue>>): CellValue[] {
  const out: CellValue[] = []
  for (const a of args) {
    if (Array.isArray(a)) {
      for (const v of a) out.push(v)
    } else {
      out.push(a as CellValue)
    }
  }
  return out
}

/**
 * Coerce one argument value (scalar) to a number, propagating errors.
 *
 * @param arg - Argument value.
 * @returns Number or error.
 */
function asScalarNumber(arg: CellValue | ReadonlyArray<CellValue>): number | { error: CellValue } {
  if (Array.isArray(arg)) {
    if (arg.length === 0) return 0
    return asScalarNumber(arg[0] as CellValue)
  }
  const v = arg as CellValue
  const n = toNumber(v)
  if (isError(n)) return { error: n }
  return n
}

/**
 * Extract the first element of a range argument, or return the scalar as-is.
 */
function asScalar(arg: CellValue | ReadonlyArray<CellValue>): CellValue {
  if (Array.isArray(arg)) return arg.length === 0 ? null : (arg[0] as CellValue)
  return arg as CellValue
}

/** SUM(...): numeric sum, ignoring text and booleans Excel-style. */
const SUM: FormulaFunction = (args) => {
  const flat = flattenAll(args)
  let total = 0
  for (const v of flat) {
    if (isError(v)) return v
    if (typeof v === 'number') total += v
    else if (v instanceof Date) total += dateToSerial(v)
    else if (typeof v === 'boolean') total += v ? 1 : 0
    // strings, null → ignored (Excel SUM behavior)
  }
  return total
}

/** AVERAGE / AVG: numeric mean, error on empty. */
const AVERAGE: FormulaFunction = (args) => {
  const flat = flattenAll(args)
  let total = 0
  let count = 0
  for (const v of flat) {
    if (isError(v)) return v
    if (typeof v === 'number') {
      total += v
      count++
    } else if (typeof v === 'boolean') {
      total += v ? 1 : 0
      count++
    } else if (v instanceof Date) {
      total += dateToSerial(v)
      count++
    }
  }
  if (count === 0) return makeError('#DIV/0!')
  return total / count
}

/** MIN: numeric minimum. */
const MIN: FormulaFunction = (args) => {
  const flat = flattenAll(args)
  let min = Number.POSITIVE_INFINITY
  let seen = false
  for (const v of flat) {
    if (isError(v)) return v
    if (typeof v === 'number') {
      if (v < min) min = v
      seen = true
    } else if (v instanceof Date) {
      const n = dateToSerial(v)
      if (n < min) min = n
      seen = true
    } else if (typeof v === 'boolean') {
      const n = v ? 1 : 0
      if (n < min) min = n
      seen = true
    }
  }
  return seen ? min : 0
}

/** MAX: numeric maximum. */
const MAX: FormulaFunction = (args) => {
  const flat = flattenAll(args)
  let max = Number.NEGATIVE_INFINITY
  let seen = false
  for (const v of flat) {
    if (isError(v)) return v
    if (typeof v === 'number') {
      if (v > max) max = v
      seen = true
    } else if (v instanceof Date) {
      const n = dateToSerial(v)
      if (n > max) max = n
      seen = true
    } else if (typeof v === 'boolean') {
      const n = v ? 1 : 0
      if (n > max) max = n
      seen = true
    }
  }
  return seen ? max : 0
}

/** COUNT: numeric count only. */
const COUNT: FormulaFunction = (args) => {
  const flat = flattenAll(args)
  let n = 0
  for (const v of flat) {
    if (typeof v === 'number' || v instanceof Date) n++
  }
  return n
}

/** COUNTA: non-empty count (any type except null/empty-string). */
const COUNTA: FormulaFunction = (args) => {
  const flat = flattenAll(args)
  let n = 0
  for (const v of flat) {
    if (v !== null && !(typeof v === 'string' && v === '')) n++
  }
  return n
}

/**
 * Test if a value matches a COUNTIF/SUMIF criterion. Criteria can be:
 *   - a number/string for equality (with `*` and `?` wildcards in
 *     strings)
 *   - `">5"`, `"<>foo"`, `"<=10"`, etc.
 */
function matchesCriteria(value: CellValue, criteria: CellValue): boolean {
  if (isError(value) || isError(criteria)) return false
  // Convert criteria to a string for operator parsing
  const critStr = (() => {
    if (typeof criteria === 'string') return criteria
    if (typeof criteria === 'number') return String(criteria)
    if (typeof criteria === 'boolean') return criteria ? 'TRUE' : 'FALSE'
    if (criteria === null) return ''
    return ''
  })()
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(critStr)
  const op = m?.[1] ?? '='
  const rhsRaw = m?.[2] ?? ''
  // Parse rhs as number if possible, else string
  let rhs: CellValue = rhsRaw
  const asNum = Number(rhsRaw)
  if (rhsRaw.trim() !== '' && Number.isFinite(asNum)) rhs = asNum
  if (rhsRaw.toUpperCase() === 'TRUE') rhs = true
  if (rhsRaw.toUpperCase() === 'FALSE') rhs = false
  // Wildcards only apply on plain equality with string criteria.
  if ((op === '=' || op === undefined) && typeof rhs === 'string' && /[*?]/.test(rhs)) {
    if (typeof value !== 'string') return false
    const pattern = rhs
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    return new RegExp(`^${pattern}$`, 'i').test(value)
  }
  const cmp = compareValues(value, rhs)
  if (isError(cmp)) return false
  switch (op) {
    case '=':
    case undefined:
      return cmp === 0
    case '<>':
      return cmp !== 0
    case '<':
      return cmp < 0
    case '<=':
      return cmp <= 0
    case '>':
      return cmp > 0
    case '>=':
      return cmp >= 0
  }
  return false
}

/** COUNTIF(range, criteria). */
const COUNTIF: FormulaFunction = (args) => {
  if (args.length !== 2) return makeError('#VALUE!', 'COUNTIF requires exactly 2 arguments')
  const range = flatten(args[0]!)
  const crit = asScalar(args[1]!)
  if (isError(crit)) return crit
  let n = 0
  for (const v of range) {
    if (isError(v)) return v
    if (matchesCriteria(v, crit)) n++
  }
  return n
}

/** SUMIF(range, criteria, [sumRange]). */
const SUMIF: FormulaFunction = (args) => {
  if (args.length < 2 || args.length > 3) {
    return makeError('#VALUE!', 'SUMIF requires 2 or 3 arguments')
  }
  const matchRange = flatten(args[0]!)
  const crit = asScalar(args[1]!)
  if (isError(crit)) return crit
  const sumRange = args.length === 3 ? flatten(args[2]!) : matchRange
  let total = 0
  for (let i = 0; i < matchRange.length; i++) {
    const v = matchRange[i]!
    if (isError(v)) return v
    if (!matchesCriteria(v, crit)) continue
    const target = sumRange[i] ?? null
    if (isError(target)) return target
    if (typeof target === 'number') total += target
    else if (target instanceof Date) total += dateToSerial(target)
    else if (typeof target === 'boolean') total += target ? 1 : 0
  }
  return total
}

/** IF(condition, thenValue, [elseValue]). */
const IF: FormulaFunction = (args) => {
  if (args.length < 2 || args.length > 3) {
    return makeError('#VALUE!', 'IF requires 2 or 3 arguments')
  }
  const cond = asScalar(args[0]!)
  if (isError(cond)) return cond
  const b = toBoolean(cond)
  if (isError(b)) return b
  if (b) return asScalar(args[1]!)
  return args.length === 3 ? asScalar(args[2]!) : false
}

/** AND(...): true if all truthy. */
const AND: FormulaFunction = (args) => {
  const flat = flattenAll(args)
  if (flat.length === 0) return makeError('#VALUE!', 'AND requires at least one argument')
  for (const v of flat) {
    if (isError(v)) return v
    const b = toBoolean(v)
    if (isError(b)) return b
    if (!b) return false
  }
  return true
}

/** OR(...): true if any truthy. */
const OR: FormulaFunction = (args) => {
  const flat = flattenAll(args)
  if (flat.length === 0) return makeError('#VALUE!', 'OR requires at least one argument')
  for (const v of flat) {
    if (isError(v)) return v
    const b = toBoolean(v)
    if (isError(b)) return b
    if (b) return true
  }
  return false
}

/** NOT(value). */
const NOT: FormulaFunction = (args) => {
  if (args.length !== 1) return makeError('#VALUE!', 'NOT requires exactly 1 argument')
  const v = asScalar(args[0]!)
  if (isError(v)) return v
  const b = toBoolean(v)
  if (isError(b)) return b
  return !b
}

/** IFS(cond1, val1, [cond2, val2, ...]). Excel-compatible. */
const IFS: FormulaFunction = (args) => {
  if (args.length < 2 || args.length % 2 !== 0) {
    return makeError('#VALUE!', 'IFS requires pairs of (condition, value)')
  }
  for (let i = 0; i < args.length; i += 2) {
    const c = asScalar(args[i]!)
    if (isError(c)) return c
    const b = toBoolean(c)
    if (isError(b)) return b
    if (b) return asScalar(args[i + 1]!)
  }
  return makeError('#N/A', 'IFS: no condition matched')
}

/** SWITCH(expr, c1, v1, [c2, v2, ...], [default]). */
const SWITCH: FormulaFunction = (args) => {
  if (args.length < 3) {
    return makeError('#VALUE!', 'SWITCH requires at least 3 arguments')
  }
  const subject = asScalar(args[0]!)
  if (isError(subject)) return subject
  let i = 1
  while (i + 1 < args.length) {
    const candidate = asScalar(args[i]!)
    if (isError(candidate)) return candidate
    const cmp = compareValues(subject, candidate)
    if (!isError(cmp) && cmp === 0) return asScalar(args[i + 1]!)
    i += 2
  }
  // Trailing odd argument = default.
  if (i < args.length) return asScalar(args[i]!)
  return makeError('#N/A', 'SWITCH: no case matched')
}

/** IFERROR(value, fallback). */
const IFERROR: FormulaFunction = (args) => {
  if (args.length !== 2) return makeError('#VALUE!', 'IFERROR requires 2 arguments')
  const v = asScalar(args[0]!)
  if (isError(v)) return asScalar(args[1]!)
  return v
}

const ISERROR: FormulaFunction = (args) => isError(asScalar(args[0] ?? null))
const ISNUMBER: FormulaFunction = (args) => typeof asScalar(args[0] ?? null) === 'number'
const ISBLANK: FormulaFunction = (args) => asScalar(args[0] ?? null) === null

// --- String functions ---

const CONCAT: FormulaFunction = (args) => {
  const flat = flattenAll(args)
  const err = firstError(flat)
  if (err) return err
  let out = ''
  for (const v of flat) {
    const s = toStringValue(v)
    if (isError(s)) return s
    out += s
  }
  return out
}

const LEFT: FormulaFunction = (args) => {
  const text = toStringValue(asScalar(args[0] ?? null))
  if (isError(text)) return text
  const nArg = args.length >= 2 ? asScalarNumber(args[1]!) : 1
  if (typeof nArg === 'object') return nArg.error
  if (nArg < 0) return makeError('#VALUE!')
  return text.slice(0, Math.floor(nArg))
}

const RIGHT: FormulaFunction = (args) => {
  const text = toStringValue(asScalar(args[0] ?? null))
  if (isError(text)) return text
  const nArg = args.length >= 2 ? asScalarNumber(args[1]!) : 1
  if (typeof nArg === 'object') return nArg.error
  if (nArg < 0) return makeError('#VALUE!')
  return nArg === 0 ? '' : text.slice(-Math.floor(nArg))
}

const MID: FormulaFunction = (args) => {
  if (args.length !== 3) return makeError('#VALUE!', 'MID requires 3 arguments')
  const text = toStringValue(asScalar(args[0]!))
  if (isError(text)) return text
  const startN = asScalarNumber(args[1]!)
  if (typeof startN === 'object') return startN.error
  const lengthN = asScalarNumber(args[2]!)
  if (typeof lengthN === 'object') return lengthN.error
  if (startN < 1 || lengthN < 0) return makeError('#VALUE!')
  return text.slice(Math.floor(startN) - 1, Math.floor(startN) - 1 + Math.floor(lengthN))
}

const LEN: FormulaFunction = (args) => {
  const text = toStringValue(asScalar(args[0] ?? null))
  if (isError(text)) return text
  return text.length
}

const TRIM: FormulaFunction = (args) => {
  const text = toStringValue(asScalar(args[0] ?? null))
  if (isError(text)) return text
  // Excel TRIM collapses multiple internal spaces to one and strips ends.
  return text.replace(/\s+/g, ' ').trim()
}

const UPPER: FormulaFunction = (args) => {
  const text = toStringValue(asScalar(args[0] ?? null))
  if (isError(text)) return text
  return text.toUpperCase()
}

const LOWER: FormulaFunction = (args) => {
  const text = toStringValue(asScalar(args[0] ?? null))
  if (isError(text)) return text
  return text.toLowerCase()
}

const SUBSTITUTE: FormulaFunction = (args) => {
  if (args.length < 3 || args.length > 4) {
    return makeError('#VALUE!', 'SUBSTITUTE requires 3 or 4 arguments')
  }
  const text = toStringValue(asScalar(args[0]!))
  if (isError(text)) return text
  const oldText = toStringValue(asScalar(args[1]!))
  if (isError(oldText)) return oldText
  const newText = toStringValue(asScalar(args[2]!))
  if (isError(newText)) return newText
  if (oldText === '') return text
  if (args.length === 3) {
    return text.split(oldText).join(newText)
  }
  const instanceN = asScalarNumber(args[3]!)
  if (typeof instanceN === 'object') return instanceN.error
  if (instanceN < 1) return makeError('#VALUE!')
  let count = 0
  let idx = 0
  while (idx <= text.length) {
    const found = text.indexOf(oldText, idx)
    if (found < 0) break
    count++
    if (count === Math.floor(instanceN)) {
      return text.slice(0, found) + newText + text.slice(found + oldText.length)
    }
    idx = found + oldText.length
  }
  return text
}

// --- Math functions ---

const ROUND: FormulaFunction = (args) => {
  const n = asScalarNumber(args[0] ?? 0)
  if (typeof n === 'object') return n.error
  const digits = args.length >= 2 ? asScalarNumber(args[1]!) : 0
  if (typeof digits === 'object') return digits.error
  const f = 10 ** Math.floor(digits)
  return Math.round(n * f) / f
}

const ABS: FormulaFunction = (args) => {
  const n = asScalarNumber(args[0] ?? 0)
  if (typeof n === 'object') return n.error
  return Math.abs(n)
}

const MOD: FormulaFunction = (args) => {
  if (args.length !== 2) return makeError('#VALUE!', 'MOD requires 2 arguments')
  const a = asScalarNumber(args[0]!)
  if (typeof a === 'object') return a.error
  const b = asScalarNumber(args[1]!)
  if (typeof b === 'object') return b.error
  if (b === 0) return makeError('#DIV/0!')
  // Excel MOD: result has sign of divisor.
  return a - b * Math.floor(a / b)
}

const POWER: FormulaFunction = (args) => {
  if (args.length !== 2) return makeError('#VALUE!', 'POWER requires 2 arguments')
  const a = asScalarNumber(args[0]!)
  if (typeof a === 'object') return a.error
  const b = asScalarNumber(args[1]!)
  if (typeof b === 'object') return b.error
  const r = a ** b
  if (!Number.isFinite(r)) return makeError('#NUM!')
  return r
}

const SQRT: FormulaFunction = (args) => {
  const n = asScalarNumber(args[0] ?? 0)
  if (typeof n === 'object') return n.error
  if (n < 0) return makeError('#NUM!')
  return Math.sqrt(n)
}

const INT: FormulaFunction = (args) => {
  const n = asScalarNumber(args[0] ?? 0)
  if (typeof n === 'object') return n.error
  return Math.floor(n)
}

const CEILING: FormulaFunction = (args) => {
  const n = asScalarNumber(args[0] ?? 0)
  if (typeof n === 'object') return n.error
  const sig = args.length >= 2 ? asScalarNumber(args[1]!) : 1
  if (typeof sig === 'object') return sig.error
  if (sig === 0) return 0
  return Math.ceil(n / sig) * sig
}

const FLOOR: FormulaFunction = (args) => {
  const n = asScalarNumber(args[0] ?? 0)
  if (typeof n === 'object') return n.error
  const sig = args.length >= 2 ? asScalarNumber(args[1]!) : 1
  if (typeof sig === 'object') return sig.error
  if (sig === 0) return makeError('#DIV/0!')
  return Math.floor(n / sig) * sig
}

// --- Date functions ---

const DATE: FormulaFunction = (args) => {
  if (args.length !== 3) return makeError('#VALUE!', 'DATE requires 3 arguments')
  const y = asScalarNumber(args[0]!)
  if (typeof y === 'object') return y.error
  const m = asScalarNumber(args[1]!)
  if (typeof m === 'object') return m.error
  const d = asScalarNumber(args[2]!)
  if (typeof d === 'object') return d.error
  // Excel: years <100 add 1900.
  const year = y < 100 ? y + 1900 : y
  return new Date(Date.UTC(year, Math.floor(m) - 1, Math.floor(d)))
}

const TODAY: FormulaFunction = (_args, ctx: FunctionContext) => {
  const now = ctx.now()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

const NOW: FormulaFunction = (_args, ctx: FunctionContext) => ctx.now()

const YEAR: FormulaFunction = (args) => {
  const v = asScalar(args[0] ?? null)
  if (isError(v)) return v
  if (v instanceof Date) return v.getUTCFullYear()
  const n = toNumber(v)
  if (isError(n)) return n
  return serialToDate(n).getUTCFullYear()
}

const MONTH: FormulaFunction = (args) => {
  const v = asScalar(args[0] ?? null)
  if (isError(v)) return v
  if (v instanceof Date) return v.getUTCMonth() + 1
  const n = toNumber(v)
  if (isError(n)) return n
  return serialToDate(n).getUTCMonth() + 1
}

const DAY: FormulaFunction = (args) => {
  const v = asScalar(args[0] ?? null)
  if (isError(v)) return v
  if (v instanceof Date) return v.getUTCDate()
  const n = toNumber(v)
  if (isError(n)) return n
  return serialToDate(n).getUTCDate()
}

/**
 * DATEDIFF(start, end, unit) — computes whole-unit difference.
 * Units: "D" days, "M" months, "Y" years, "H" hours, "MIN" minutes,
 * "S" seconds.
 */
const DATEDIFF: FormulaFunction = (args) => {
  if (args.length !== 3) return makeError('#VALUE!', 'DATEDIFF requires 3 arguments')
  const startV = asScalar(args[0]!)
  if (isError(startV)) return startV
  const endV = asScalar(args[1]!)
  if (isError(endV)) return endV
  const unitV = asScalar(args[2]!)
  if (isError(unitV)) return unitV
  const start =
    startV instanceof Date
      ? startV
      : (() => {
          const n = toNumber(startV)
          if (isError(n)) return n
          return serialToDate(n)
        })()
  if (isError(start)) return start
  const end =
    endV instanceof Date
      ? endV
      : (() => {
          const n = toNumber(endV)
          if (isError(n)) return n
          return serialToDate(n)
        })()
  if (isError(end)) return end
  const unit = String(unitV).toUpperCase()
  const ms = end.getTime() - start.getTime()
  switch (unit) {
    case 'D':
      return Math.trunc(ms / 86_400_000)
    case 'H':
      return Math.trunc(ms / 3_600_000)
    case 'MIN':
      return Math.trunc(ms / 60_000)
    case 'S':
      return Math.trunc(ms / 1000)
    case 'M':
      return (
        (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (end.getUTCMonth() - start.getUTCMonth()) -
        (end.getUTCDate() < start.getUTCDate() ? 1 : 0)
      )
    case 'Y': {
      let years = end.getUTCFullYear() - start.getUTCFullYear()
      if (
        end.getUTCMonth() < start.getUTCMonth() ||
        (end.getUTCMonth() === start.getUTCMonth() && end.getUTCDate() < start.getUTCDate())
      ) {
        years--
      }
      return years
    }
    default:
      return makeError('#NUM!', `Unknown unit: ${unit}`)
  }
}

/**
 * Map of function names (uppercase) to implementations. Aliases like
 * `AVG → AVERAGE` and `DATEDIF → DATEDIFF` map to the same function
 * reference.
 */
export const BUILTIN_FUNCTIONS: Readonly<Record<string, FormulaFunction>> = Object.freeze({
  SUM,
  AVERAGE,
  AVG: AVERAGE,
  MIN,
  MAX,
  COUNT,
  COUNTA,
  COUNTIF,
  SUMIF,
  IF,
  AND,
  OR,
  NOT,
  IFS,
  SWITCH,
  IFERROR,
  ISERROR,
  ISNUMBER,
  ISBLANK,
  CONCAT,
  CONCATENATE: CONCAT,
  LEFT,
  RIGHT,
  MID,
  LEN,
  TRIM,
  UPPER,
  LOWER,
  SUBSTITUTE,
  ROUND,
  ABS,
  MOD,
  POWER,
  SQRT,
  INT,
  CEILING,
  FLOOR,
  DATE,
  TODAY,
  NOW,
  YEAR,
  MONTH,
  DAY,
  DATEDIFF,
  DATEDIF: DATEDIFF,
})
