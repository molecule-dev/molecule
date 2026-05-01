import { describe, expect, it } from 'vitest'

import { parseFormula } from '../parser.js'
import type { BinaryOpNode, FunctionCallNode, RangeNode, ReferenceNode } from '../types.js'

describe('parseFormula', () => {
  it('parses a number literal', () => {
    const ast = parseFormula('=42')
    expect(ast).toEqual({ kind: 'number', value: 42 })
  })

  it('parses without leading equals', () => {
    expect(parseFormula('1.5e2')).toEqual({ kind: 'number', value: 150 })
  })

  it('parses string literals with escaped quotes', () => {
    expect(parseFormula('="he said ""hi"""')).toEqual({
      kind: 'string',
      value: 'he said "hi"',
    })
  })

  it('parses booleans (case-insensitive)', () => {
    expect(parseFormula('=TRUE')).toEqual({ kind: 'boolean', value: true })
    expect(parseFormula('=false')).toEqual({ kind: 'boolean', value: false })
  })

  it('parses references with mixed absoluteness', () => {
    const ast = parseFormula('=$A$1') as ReferenceNode
    expect(ast.kind).toBe('reference')
    expect(ast.coord).toEqual({ col: 0, row: 0 })
    expect(ast.text).toBe('$A$1')
  })

  it('parses ranges', () => {
    const ast = parseFormula('=A1:B5') as RangeNode
    expect(ast.kind).toBe('range')
    expect(ast.range).toEqual({ start: { col: 0, row: 0 }, end: { col: 1, row: 4 } })
  })

  it('honors operator precedence', () => {
    const ast = parseFormula('=1 + 2 * 3') as BinaryOpNode
    expect(ast.kind).toBe('binary')
    expect(ast.op).toBe('+')
    const right = ast.right as BinaryOpNode
    expect(right.op).toBe('*')
  })

  it('treats ^ as right-associative', () => {
    const ast = parseFormula('=2^3^2') as BinaryOpNode
    expect(ast.op).toBe('^')
    expect((ast.left as { value: number }).value).toBe(2)
    expect((ast.right as BinaryOpNode).op).toBe('^')
  })

  it('parses function calls with multiple args', () => {
    const ast = parseFormula('=SUM(A1, B1:B5, 10)') as FunctionCallNode
    expect(ast.kind).toBe('call')
    expect(ast.name).toBe('SUM')
    expect(ast.args).toHaveLength(3)
  })

  it('uppercases function names', () => {
    expect((parseFormula('=sum(1)') as FunctionCallNode).name).toBe('SUM')
  })

  it('throws on unbalanced parens', () => {
    expect(() => parseFormula('=SUM(1,2')).toThrow()
  })

  it('throws on unterminated strings', () => {
    expect(() => parseFormula('="abc')).toThrow()
  })

  it('throws on empty input', () => {
    expect(() => parseFormula('=')).toThrow(/Empty formula/)
  })

  it('parses unary minus', () => {
    const ast = parseFormula('=-A1+5')
    expect(ast.kind).toBe('binary')
  })

  it('parses postfix percent', () => {
    expect(parseFormula('=50%')).toEqual({
      kind: 'unary',
      op: '%',
      operand: { kind: 'number', value: 50 },
    })
  })

  it('parses error literals', () => {
    expect(parseFormula('=#DIV/0!')).toEqual({ kind: 'errorLiteral', code: '#DIV/0!' })
    expect(parseFormula('=#N/A')).toEqual({ kind: 'errorLiteral', code: '#N/A' })
  })
})
