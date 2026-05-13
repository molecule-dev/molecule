import { describe, expect, it } from 'vitest'

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
} from '../values.js'

describe('makeError', () => {
  it('builds error with code only when message omitted', () => {
    expect(makeError('#DIV/0!')).toEqual({ type: 'error', code: '#DIV/0!' })
  })

  it('includes message when provided', () => {
    expect(makeError('#VALUE!', 'bad input')).toEqual({
      type: 'error',
      code: '#VALUE!',
      message: 'bad input',
    })
  })
})

describe('isError', () => {
  it('true for objects shaped like FormulaError', () => {
    expect(isError(makeError('#DIV/0!'))).toBe(true)
  })

  it('false for primitives', () => {
    expect(isError(null)).toBe(false)
    expect(isError('string')).toBe(false)
    expect(isError(0)).toBe(false)
    expect(isError(false)).toBe(false)
  })

  it('false for plain objects without type:error', () => {
    expect(isError({})).toBe(false)
    expect(isError({ type: 'other' })).toBe(false)
  })
})

describe('firstError', () => {
  it('returns the first error in the list', () => {
    const err1 = makeError('#VALUE!')
    const err2 = makeError('#NUM!')
    expect(firstError([1, err1, err2, 2])).toBe(err1)
  })

  it('returns null when no errors', () => {
    expect(firstError([1, 2, 'x'])).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(firstError([])).toBeNull()
  })
})

describe('toNumber', () => {
  it('null → 0', () => {
    expect(toNumber(null)).toBe(0)
  })

  it('number passes through', () => {
    expect(toNumber(42)).toBe(42)
    expect(toNumber(-3.14)).toBe(-3.14)
  })

  it('boolean → 0/1 (Excel semantics)', () => {
    expect(toNumber(true)).toBe(1)
    expect(toNumber(false)).toBe(0)
  })

  it('Date → Excel serial', () => {
    // 1900-01-01 = serial 2 (Excel quirk: 1899-12-30 is day 0)
    const d = new Date(Date.UTC(1900, 0, 1))
    expect(toNumber(d)).toBe(2)
  })

  it('string parses as number', () => {
    expect(toNumber('42')).toBe(42)
    expect(toNumber('3.14')).toBe(3.14)
  })

  it('empty string → 0', () => {
    expect(toNumber('')).toBe(0)
    expect(toNumber('   ')).toBe(0)
  })

  it('non-numeric string → #VALUE!', () => {
    const result = toNumber('hello')
    expect(isError(result)).toBe(true)
    if (isError(result)) expect(result.code).toBe('#VALUE!')
  })

  it('error propagates unchanged', () => {
    const err = makeError('#REF!')
    expect(toNumber(err)).toBe(err)
  })
})

describe('toStringValue', () => {
  it('null → empty string', () => {
    expect(toStringValue(null)).toBe('')
  })

  it('string passes through', () => {
    expect(toStringValue('hello')).toBe('hello')
  })

  it('number → string', () => {
    expect(toStringValue(42)).toBe('42')
    expect(toStringValue(3.14)).toBe('3.14')
  })

  it('non-finite number → #NUM!', () => {
    const r1 = toStringValue(Number.POSITIVE_INFINITY)
    expect(isError(r1)).toBe(true)
    if (isError(r1)) expect(r1.code).toBe('#NUM!')
    expect(isError(toStringValue(Number.NaN))).toBe(true)
  })

  it('boolean → TRUE / FALSE (uppercase)', () => {
    expect(toStringValue(true)).toBe('TRUE')
    expect(toStringValue(false)).toBe('FALSE')
  })

  it('Date → ISO string', () => {
    const d = new Date('2026-05-13T10:00:00Z')
    expect(toStringValue(d)).toBe('2026-05-13T10:00:00.000Z')
  })

  it('error propagates', () => {
    const err = makeError('#DIV/0!')
    expect(toStringValue(err)).toBe(err)
  })
})

describe('toBoolean', () => {
  it('boolean passes through', () => {
    expect(toBoolean(true)).toBe(true)
    expect(toBoolean(false)).toBe(false)
  })

  it('null → false', () => {
    expect(toBoolean(null)).toBe(false)
  })

  it('number → truthiness (0=false, else true)', () => {
    expect(toBoolean(0)).toBe(false)
    expect(toBoolean(1)).toBe(true)
    expect(toBoolean(-5)).toBe(true)
  })

  it('string "TRUE" / "FALSE" case-insensitive + trim', () => {
    expect(toBoolean('TRUE')).toBe(true)
    expect(toBoolean(' true ')).toBe(true)
    expect(toBoolean('FALSE')).toBe(false)
    expect(toBoolean('false')).toBe(false)
  })

  it('other strings → #VALUE!', () => {
    const r = toBoolean('hello')
    expect(isError(r)).toBe(true)
  })

  it('error propagates', () => {
    const err = makeError('#NUM!')
    expect(toBoolean(err)).toBe(err)
  })
})

describe('dateToSerial / serialToDate (round-trip)', () => {
  it('1899-12-30 → 0', () => {
    expect(dateToSerial(new Date(Date.UTC(1899, 11, 30)))).toBe(0)
  })

  it('1900-01-01 → 2', () => {
    expect(dateToSerial(new Date(Date.UTC(1900, 0, 1)))).toBe(2)
  })

  it('serialToDate is the inverse of dateToSerial', () => {
    const original = new Date(Date.UTC(2026, 4, 13, 10, 30, 0))
    const serial = dateToSerial(original)
    expect(serialToDate(serial).getTime()).toBe(original.getTime())
  })

  it('round-trips integer-day serials to midnight UTC', () => {
    const date = serialToDate(45000)
    expect(date.getUTCHours()).toBe(0)
    expect(dateToSerial(date)).toBe(45000)
  })
})

describe('compareValues', () => {
  it('numbers — equal / less / greater', () => {
    expect(compareValues(1, 1)).toBe(0)
    expect(compareValues(1, 2)).toBe(-1)
    expect(compareValues(2, 1)).toBe(1)
  })

  it('Excel ordering: number always sorts before string', () => {
    expect(compareValues(99, 'a')).toBe(-1)
    expect(compareValues('a', 99)).toBe(1)
  })

  it('null is treated as 0 against numbers', () => {
    expect(compareValues(null, 0)).toBe(0)
    expect(compareValues(null, 1)).toBe(-1)
  })

  it('booleans compared as 0/1 within numeric space', () => {
    expect(compareValues(true, 1)).toBe(0)
    expect(compareValues(false, 0)).toBe(0)
    expect(compareValues(false, true)).toBe(-1)
  })

  it('strings compared case-insensitively', () => {
    expect(compareValues('abc', 'ABC')).toBe(0)
    expect(compareValues('abc', 'def')).toBe(-1)
    expect(compareValues('def', 'abc')).toBe(1)
  })

  it('Date vs number compared via serial', () => {
    const date = new Date(Date.UTC(1900, 0, 1))
    expect(compareValues(date, 2)).toBe(0)
  })

  it('error propagates from either side', () => {
    const err = makeError('#VALUE!')
    expect(compareValues(err, 1)).toBe(err)
    expect(compareValues(1, err)).toBe(err)
  })
})
