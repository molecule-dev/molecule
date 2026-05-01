import { describe, expect, it } from 'vitest'

import { Sheet } from '../sheet.js'
import { isError } from '../values.js'

describe('Sheet: setValue / getValue', () => {
  it('stores and reads literal values', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 10)
    expect(sheet.getValue('A1')).toBe(10)
  })

  it('returns null for empty cells', () => {
    const sheet = new Sheet()
    expect(sheet.getValue('Z9')).toBeNull()
  })

  it('throws on invalid references', () => {
    const sheet = new Sheet()
    expect(() => sheet.setValue('1A', 1)).toThrow()
  })
})

describe('Sheet: setFormula / getValue', () => {
  it('evaluates a simple formula', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 10)
    sheet.setValue('A2', 20)
    sheet.setFormula('A3', '=A1+A2')
    expect(sheet.getValue('A3')).toBe(30)
  })

  it('evaluates aggregations over ranges', () => {
    const sheet = new Sheet()
    for (let i = 0; i < 5; i++) sheet.setValue(`A${i + 1}`, i + 1)
    sheet.setFormula('B1', '=SUM(A1:A5)')
    expect(sheet.getValue('B1')).toBe(15)
  })

  it('stores parse errors as cell values', () => {
    const sheet = new Sheet()
    sheet.setFormula('A1', '=SUM(')
    const v = sheet.getValue('A1')
    expect(isError(v) && v.code).toBe('#VALUE!')
  })

  it('preserves formula text via getFormula', () => {
    const sheet = new Sheet()
    sheet.setFormula('A1', '=1+2')
    expect(sheet.getFormula('A1')).toBe('=1+2')
    expect(sheet.getValue('A1')).toBe(3)
  })

  it('returns null formula for literal cells', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 5)
    expect(sheet.getFormula('A1')).toBeNull()
  })
})

describe('Sheet: incremental recompute', () => {
  it('recomputes downstream cells when a precedent changes', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 10)
    sheet.setFormula('B1', '=A1*2')
    sheet.setFormula('C1', '=B1+1')
    expect(sheet.getValue('B1')).toBe(20)
    expect(sheet.getValue('C1')).toBe(21)

    sheet.setValue('A1', 50)
    expect(sheet.getValue('B1')).toBe(100)
    expect(sheet.getValue('C1')).toBe(101)
  })

  it('recomputes when a formula is replaced', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 10)
    sheet.setFormula('B1', '=A1*2')
    expect(sheet.getValue('B1')).toBe(20)
    sheet.setFormula('B1', '=A1+100')
    expect(sheet.getValue('B1')).toBe(110)
  })

  it('clear removes a cell and recomputes downstream', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 10)
    sheet.setFormula('B1', '=A1*2')
    sheet.clear('A1')
    expect(sheet.getValue('A1')).toBeNull()
    expect(sheet.getValue('B1')).toBe(0) // null coerces to 0 in arithmetic
  })

  it('handles ranges as dependencies', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 1)
    sheet.setValue('A2', 2)
    sheet.setValue('A3', 3)
    sheet.setFormula('B1', '=SUM(A1:A3)')
    expect(sheet.getValue('B1')).toBe(6)
    sheet.setValue('A2', 200)
    expect(sheet.getValue('B1')).toBe(204)
  })
})

describe('Sheet: circular references', () => {
  it('detects direct cycles', () => {
    const sheet = new Sheet()
    sheet.setFormula('A1', '=A1+1')
    const v = sheet.getValue('A1')
    expect(isError(v) && v.code).toBe('#CIRC!')
  })

  it('detects indirect cycles', () => {
    const sheet = new Sheet()
    sheet.setFormula('A1', '=B1+1')
    sheet.setFormula('B1', '=C1+1')
    sheet.setFormula('C1', '=A1+1')
    expect(isError(sheet.getValue('A1'))).toBe(true)
    expect(isError(sheet.getValue('B1'))).toBe(true)
    expect(isError(sheet.getValue('C1'))).toBe(true)
    expect((sheet.getValue('A1') as { code: string }).code).toBe('#CIRC!')
  })

  it('cells outside the cycle are unaffected', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 10)
    sheet.setFormula('B1', '=A1*2')
    sheet.setFormula('C1', '=D1+1')
    sheet.setFormula('D1', '=C1+1') // cycle
    expect(sheet.getValue('B1')).toBe(20)
    expect((sheet.getValue('C1') as { code: string }).code).toBe('#CIRC!')
  })
})

describe('Sheet: error propagation', () => {
  it('propagates #DIV/0! up the dependency chain', () => {
    const sheet = new Sheet()
    sheet.setFormula('A1', '=1/0')
    sheet.setFormula('A2', '=A1+1')
    sheet.setFormula('A3', '=A2*5')
    expect((sheet.getValue('A3') as { code: string }).code).toBe('#DIV/0!')
  })

  it('IFERROR catches downstream errors', () => {
    const sheet = new Sheet()
    sheet.setFormula('A1', '=1/0')
    sheet.setFormula('A2', '=IFERROR(A1, "fallback")')
    expect(sheet.getValue('A2')).toBe('fallback')
  })
})

describe('Sheet: evaluateFormula (stateless)', () => {
  it('reads from existing cells without mutating', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 7)
    expect(sheet.evaluateFormula('=A1*A1')).toBe(49)
    expect(sheet.getValue('B1')).toBeNull() // no mutation
  })

  it('returns parse errors', () => {
    const sheet = new Sheet()
    const v = sheet.evaluateFormula('=SUM(')
    expect(isError(v) && v.code).toBe('#VALUE!')
  })
})

describe('Sheet: recomputeAll', () => {
  it('recomputes every formula', () => {
    const sheet = new Sheet()
    sheet.setValue('A1', 1)
    sheet.setFormula('A2', '=A1*10')
    sheet.setFormula('A3', '=A2+5')
    sheet.recomputeAll()
    expect(sheet.getValue('A3')).toBe(15)
  })

  it('honors options.now during recomputeAll', () => {
    const sheet = new Sheet()
    sheet.setFormula('A1', '=YEAR(NOW())')
    sheet.recomputeAll({ now: () => new Date(Date.UTC(2030, 0, 1)) })
    expect(sheet.getValue('A1')).toBe(2030)
  })
})

describe('Sheet: invoice line-item example', () => {
  it('computes line totals + grand total', () => {
    const sheet = new Sheet()
    // qty * unit_price for 3 lines, then sum.
    const lines = [
      [2, 19.99],
      [1, 49.99],
      [4, 5.0],
    ]
    for (let i = 0; i < lines.length; i++) {
      sheet.setValue(`A${i + 1}`, lines[i]![0]!)
      sheet.setValue(`B${i + 1}`, lines[i]![1]!)
      sheet.setFormula(`C${i + 1}`, `=A${i + 1}*B${i + 1}`)
    }
    sheet.setFormula('C4', '=SUM(C1:C3)')
    sheet.setFormula('C5', '=ROUND(C4 * 1.0875, 2)')
    expect(sheet.getValue('C1')).toBeCloseTo(39.98, 5)
    expect(sheet.getValue('C2')).toBeCloseTo(49.99, 5)
    expect(sheet.getValue('C3')).toBeCloseTo(20, 5)
    expect(sheet.getValue('C4')).toBeCloseTo(109.97, 5)
    expect(sheet.getValue('C5')).toBeCloseTo(119.59, 5)
  })
})
