import { describe, expect, it } from 'vitest'

import { evaluate } from '../evaluator.js'
import { parseFormula } from '../parser.js'
import type { CellCoord, CellValue } from '../types.js'
import { isError } from '../values.js'

function evalFormula(
  formula: string,
  cells: Record<string, CellValue> = {},
  options: { now?: () => Date } = {},
): CellValue {
  const ast = parseFormula(formula)
  return evaluate(
    ast,
    (coord: CellCoord) => {
      const ref = `${String.fromCharCode(65 + coord.col)}${coord.row + 1}`
      return cells[ref] ?? null
    },
    options,
  )
}

describe('evaluator: arithmetic', () => {
  it('handles + - * /', () => {
    expect(evalFormula('=2+3')).toBe(5)
    expect(evalFormula('=10-4')).toBe(6)
    expect(evalFormula('=6*7')).toBe(42)
    expect(evalFormula('=20/5')).toBe(4)
  })

  it('handles ^ (power)', () => {
    expect(evalFormula('=2^10')).toBe(1024)
    expect(evalFormula('=2^3^2')).toBe(512) // right-assoc
  })

  it('handles % (postfix)', () => {
    expect(evalFormula('=50%')).toBe(0.5)
  })

  it('returns #DIV/0! on divide by zero', () => {
    const v = evalFormula('=1/0')
    expect(isError(v) && v.code).toBe('#DIV/0!')
  })

  it('returns #NUM! on overflow', () => {
    const v = evalFormula('=10^500')
    expect(isError(v) && v.code).toBe('#NUM!')
  })

  it('respects unary minus', () => {
    expect(evalFormula('=-5')).toBe(-5)
    expect(evalFormula('=--5')).toBe(5)
  })

  it('coerces strings that look like numbers', () => {
    expect(evalFormula('=A1+10', { A1: '5' })).toBe(15)
  })

  it('returns #VALUE! on non-numeric strings', () => {
    const v = evalFormula('=A1+1', { A1: 'abc' })
    expect(isError(v) && v.code).toBe('#VALUE!')
  })
})

describe('evaluator: comparison', () => {
  it('handles = and <>', () => {
    expect(evalFormula('=1=1')).toBe(true)
    expect(evalFormula('=1=2')).toBe(false)
    expect(evalFormula('=1<>2')).toBe(true)
  })

  it('handles ordering', () => {
    expect(evalFormula('=3<5')).toBe(true)
    expect(evalFormula('=3<=3')).toBe(true)
    expect(evalFormula('=5>=3')).toBe(true)
    expect(evalFormula('=5>5')).toBe(false)
  })

  it('compares strings case-insensitively', () => {
    expect(evalFormula('="abc"="ABC"')).toBe(true)
  })

  it('numbers always sort before strings', () => {
    expect(evalFormula('=A1<B1', { A1: 5, B1: 'foo' })).toBe(true)
  })
})

describe('evaluator: string ops', () => {
  it('& concatenates', () => {
    expect(evalFormula('="hello "&"world"')).toBe('hello world')
    expect(evalFormula('="x="&A1', { A1: 42 })).toBe('x=42')
  })
})

describe('evaluator: error propagation', () => {
  it('propagates errors through arithmetic', () => {
    const v = evalFormula('=A1+1', { A1: { type: 'error', code: '#REF!' } })
    expect(isError(v) && v.code).toBe('#REF!')
  })

  it('propagates errors through &', () => {
    const v = evalFormula('=A1&"x"', { A1: { type: 'error', code: '#N/A' } })
    expect(isError(v) && v.code).toBe('#N/A')
  })

  it('error literals evaluate to errors', () => {
    const v = evalFormula('=#DIV/0!')
    expect(isError(v) && v.code).toBe('#DIV/0!')
  })
})

describe('evaluator: aggregations', () => {
  const grid = { A1: 1, A2: 2, A3: 3, A4: 4, A5: 5 }
  it('SUM', () => {
    expect(evalFormula('=SUM(A1:A5)', grid)).toBe(15)
  })
  it('AVERAGE/AVG', () => {
    expect(evalFormula('=AVERAGE(A1:A5)', grid)).toBe(3)
    expect(evalFormula('=AVG(A1:A5)', grid)).toBe(3)
  })
  it('MIN/MAX', () => {
    expect(evalFormula('=MIN(A1:A5)', grid)).toBe(1)
    expect(evalFormula('=MAX(A1:A5)', grid)).toBe(5)
  })
  it('COUNT counts only numbers', () => {
    expect(evalFormula('=COUNT(A1:A5, "x", TRUE)', grid)).toBe(5)
  })
  it('COUNTIF with comparison', () => {
    expect(evalFormula('=COUNTIF(A1:A5, ">2")', grid)).toBe(3)
  })
  it('COUNTIF with wildcard', () => {
    expect(evalFormula('=COUNTIF(A1:A3, "fo*")', { A1: 'foo', A2: 'foobar', A3: 'baz' })).toBe(2)
  })
  it('SUMIF with parallel sumRange', () => {
    expect(
      evalFormula('=SUMIF(A1:A3, ">=20", B1:B3)', {
        A1: 10,
        A2: 20,
        A3: 30,
        B1: 1,
        B2: 2,
        B3: 3,
      }),
    ).toBe(5)
  })
  it('AVERAGE on empty range → #DIV/0!', () => {
    const v = evalFormula('=AVERAGE(A1:A3)', {})
    expect(isError(v) && v.code).toBe('#DIV/0!')
  })
})

describe('evaluator: conditionals', () => {
  it('IF then/else', () => {
    expect(evalFormula('=IF(A1>0, "y", "n")', { A1: 5 })).toBe('y')
    expect(evalFormula('=IF(A1>0, "y", "n")', { A1: -1 })).toBe('n')
  })
  it('IF without else returns FALSE', () => {
    expect(evalFormula('=IF(FALSE, "y")')).toBe(false)
  })
  it('AND / OR / NOT', () => {
    expect(evalFormula('=AND(TRUE, 1, "TRUE")')).toBe(true)
    expect(evalFormula('=AND(TRUE, 0)')).toBe(false)
    expect(evalFormula('=OR(FALSE, 0, 1)')).toBe(true)
    expect(evalFormula('=NOT(TRUE)')).toBe(false)
  })
  it('IFS picks first match', () => {
    expect(evalFormula('=IFS(A1<0,"neg",A1=0,"zero",A1>0,"pos")', { A1: 7 })).toBe('pos')
  })
  it('IFS returns #N/A when no match', () => {
    const v = evalFormula('=IFS(A1<0,"neg")', { A1: 7 })
    expect(isError(v) && v.code).toBe('#N/A')
  })
  it('SWITCH matches and falls through to default', () => {
    expect(evalFormula('=SWITCH(A1,1,"one",2,"two","other")', { A1: 2 })).toBe('two')
    expect(evalFormula('=SWITCH(A1,1,"one",2,"two","other")', { A1: 9 })).toBe('other')
  })
  it('SWITCH returns #N/A without default', () => {
    const v = evalFormula('=SWITCH(A1,1,"one")', { A1: 9 })
    expect(isError(v) && v.code).toBe('#N/A')
  })
  it('IFERROR catches errors', () => {
    expect(evalFormula('=IFERROR(1/0, "boom")')).toBe('boom')
    expect(evalFormula('=IFERROR(1/2, "boom")')).toBe(0.5)
  })
})

describe('evaluator: text functions', () => {
  it('LEFT / RIGHT / MID', () => {
    expect(evalFormula('=LEFT("hello", 3)')).toBe('hel')
    expect(evalFormula('=RIGHT("hello", 2)')).toBe('lo')
    expect(evalFormula('=MID("hello", 2, 3)')).toBe('ell')
  })
  it('LEN / TRIM / UPPER / LOWER', () => {
    expect(evalFormula('=LEN("hello")')).toBe(5)
    expect(evalFormula('=TRIM("  a   b  ")')).toBe('a b')
    expect(evalFormula('=UPPER("aBc")')).toBe('ABC')
    expect(evalFormula('=LOWER("aBc")')).toBe('abc')
  })
  it('SUBSTITUTE all occurrences', () => {
    expect(evalFormula('=SUBSTITUTE("a-b-c","-","_")')).toBe('a_b_c')
  })
  it('SUBSTITUTE nth occurrence', () => {
    expect(evalFormula('=SUBSTITUTE("a-b-c","-","_",2)')).toBe('a-b_c')
  })
})

describe('evaluator: dates', () => {
  it('DATE constructs a Date', () => {
    const v = evalFormula('=DATE(2026, 5, 1)') as Date
    expect(v).toBeInstanceOf(Date)
    expect(v.getUTCFullYear()).toBe(2026)
    expect(v.getUTCMonth()).toBe(4)
    expect(v.getUTCDate()).toBe(1)
  })

  it('TODAY uses ctx.now', () => {
    const fixedNow = new Date(Date.UTC(2026, 4, 1, 14, 30))
    const v = evalFormula('=TODAY()', {}, { now: () => fixedNow }) as Date
    expect(v.getUTCFullYear()).toBe(2026)
    expect(v.getUTCMonth()).toBe(4)
    expect(v.getUTCDate()).toBe(1)
    expect(v.getUTCHours()).toBe(0)
  })

  it('NOW uses ctx.now', () => {
    const fixedNow = new Date(Date.UTC(2026, 4, 1, 14, 30))
    const v = evalFormula('=NOW()', {}, { now: () => fixedNow })
    expect(v).toEqual(fixedNow)
  })

  it('YEAR / MONTH / DAY', () => {
    const day = { A1: new Date(Date.UTC(2026, 4, 1)) }
    expect(evalFormula('=YEAR(A1)', day)).toBe(2026)
    expect(evalFormula('=MONTH(A1)', day)).toBe(5)
    expect(evalFormula('=DAY(A1)', day)).toBe(1)
  })

  it('DATEDIFF days', () => {
    expect(
      evalFormula('=DATEDIFF(A1, B1, "D")', {
        A1: new Date(Date.UTC(2026, 0, 1)),
        B1: new Date(Date.UTC(2026, 0, 11)),
      }),
    ).toBe(10)
  })

  it('DATEDIFF years respects partial-year', () => {
    expect(
      evalFormula('=DATEDIFF(A1, B1, "Y")', {
        A1: new Date(Date.UTC(2024, 0, 1)),
        B1: new Date(Date.UTC(2026, 0, 1)),
      }),
    ).toBe(2)
    // Not yet a full year because day-of-month not reached.
    expect(
      evalFormula('=DATEDIFF(A1, B1, "Y")', {
        A1: new Date(Date.UTC(2024, 5, 15)),
        B1: new Date(Date.UTC(2026, 5, 14)),
      }),
    ).toBe(1)
  })

  it('DATEDIFF months', () => {
    expect(
      evalFormula('=DATEDIFF(A1, B1, "M")', {
        A1: new Date(Date.UTC(2026, 0, 1)),
        B1: new Date(Date.UTC(2026, 3, 1)),
      }),
    ).toBe(3)
  })

  it('DATEDIFF unknown unit → #NUM!', () => {
    const v = evalFormula('=DATEDIFF(A1, B1, "Q")', {
      A1: new Date(Date.UTC(2026, 0, 1)),
      B1: new Date(Date.UTC(2026, 3, 1)),
    })
    expect(isError(v) && v.code).toBe('#NUM!')
  })
})

describe('evaluator: math helpers', () => {
  it('ROUND with default + custom digits', () => {
    expect(evalFormula('=ROUND(1.456, 1)')).toBe(1.5)
    expect(evalFormula('=ROUND(1.5)')).toBe(2)
  })
  it('ABS', () => {
    expect(evalFormula('=ABS(-7)')).toBe(7)
  })
  it('MOD', () => {
    expect(evalFormula('=MOD(10, 3)')).toBe(1)
  })
  it('MOD by zero → #DIV/0!', () => {
    const v = evalFormula('=MOD(1, 0)')
    expect(isError(v) && v.code).toBe('#DIV/0!')
  })
  it('POWER', () => {
    expect(evalFormula('=POWER(3, 4)')).toBe(81)
  })
  it('SQRT negative → #NUM!', () => {
    const v = evalFormula('=SQRT(-4)')
    expect(isError(v) && v.code).toBe('#NUM!')
  })
  it('CEILING / FLOOR / INT', () => {
    expect(evalFormula('=CEILING(2.1, 1)')).toBe(3)
    expect(evalFormula('=FLOOR(2.9, 1)')).toBe(2)
    expect(evalFormula('=INT(3.9)')).toBe(3)
    expect(evalFormula('=INT(-3.1)')).toBe(-4)
  })
})

describe('evaluator: unknown function', () => {
  it('returns #NAME?', () => {
    const v = evalFormula('=NOPE(1)')
    expect(isError(v) && v.code).toBe('#NAME?')
  })
})
