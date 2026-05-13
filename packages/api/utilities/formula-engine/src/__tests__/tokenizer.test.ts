import { describe, expect, it } from 'vitest'

import { tokenize } from '../tokenizer.js'

describe('tokenize — empty input + whitespace', () => {
  it('returns [] for empty string', () => {
    expect(tokenize('')).toEqual([])
  })

  it('returns [] for whitespace-only input', () => {
    expect(tokenize('   \t\n\r   ')).toEqual([])
  })

  it('skips internal whitespace between tokens', () => {
    const tokens = tokenize('1  +  2')
    expect(tokens.map((t) => t.value)).toEqual(['1', '+', '2'])
  })
})

describe('tokenize — number literals', () => {
  it('parses integers', () => {
    const [t] = tokenize('42')
    expect(t).toMatchObject({ kind: 'number', value: '42' })
  })

  it('parses decimals', () => {
    const [t] = tokenize('3.14')
    expect(t).toMatchObject({ kind: 'number', value: '3.14' })
  })

  it('parses leading-dot decimals', () => {
    const [t] = tokenize('.5')
    expect(t).toMatchObject({ kind: 'number', value: '.5' })
  })

  it('parses scientific notation', () => {
    const [t] = tokenize('1.5e10')
    expect(t).toMatchObject({ kind: 'number', value: '1.5e10' })
  })

  it('parses negative exponents', () => {
    const [t] = tokenize('2e-3')
    expect(t).toMatchObject({ kind: 'number', value: '2e-3' })
  })

  it('parses positive exponents', () => {
    const [t] = tokenize('2e+5')
    expect(t).toMatchObject({ kind: 'number', value: '2e+5' })
  })

  it('records token position', () => {
    const tokens = tokenize('  42')
    expect(tokens[0].position).toBe(2)
  })
})

describe('tokenize — string literals', () => {
  it('parses simple "..."', () => {
    const [t] = tokenize('"hello"')
    expect(t).toMatchObject({ kind: 'string', value: 'hello' })
  })

  it('parses empty string ""', () => {
    const [t] = tokenize('""')
    expect(t).toMatchObject({ kind: 'string', value: '' })
  })

  it('un-escapes "" as a literal quote inside a string', () => {
    const [t] = tokenize('"say ""hi"" please"')
    expect(t.value).toBe('say "hi" please')
  })

  it('throws on unterminated string literal', () => {
    expect(() => tokenize('"unterminated')).toThrow(/Unterminated string literal/)
  })
})

describe('tokenize — error literals', () => {
  it('parses #DIV/0! literal', () => {
    const [t] = tokenize('#DIV/0!')
    expect(t).toMatchObject({ kind: 'error', value: '#DIV/0!', errorCode: '#DIV/0!' })
  })

  it('parses #VALUE! / #REF! / #NAME? / #NUM! / #N/A / #CIRC!', () => {
    for (const code of ['#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A', '#CIRC!']) {
      const [t] = tokenize(code)
      expect(t.kind).toBe('error')
      expect(t.errorCode).toBe(code)
    }
  })

  it('throws on unrecognized #-token', () => {
    expect(() => tokenize('#BOGUS')).toThrow(/Unrecognized error code/)
  })
})

describe('tokenize — booleans + identifiers', () => {
  it('parses TRUE (case-insensitive)', () => {
    const [t] = tokenize('TRUE')
    expect(t).toMatchObject({ kind: 'boolean', value: 'TRUE' })
    expect(tokenize('True')[0].kind).toBe('boolean')
    expect(tokenize('true')[0].kind).toBe('boolean')
  })

  it('parses FALSE (case-insensitive)', () => {
    expect(tokenize('FALSE')[0]).toMatchObject({ kind: 'boolean', value: 'FALSE' })
    expect(tokenize('false')[0].kind).toBe('boolean')
  })

  it('parses function-name identifier', () => {
    expect(tokenize('SUM')[0]).toMatchObject({ kind: 'identifier', value: 'SUM' })
  })

  it('parses underscore + dotted identifier', () => {
    expect(tokenize('foo_bar.baz')[0]).toMatchObject({
      kind: 'identifier',
      value: 'foo_bar.baz',
    })
  })
})

describe('tokenize — references + ranges', () => {
  it('parses A1 as a reference', () => {
    expect(tokenize('A1')[0]).toMatchObject({ kind: 'reference', value: 'A1' })
  })

  it('parses absolute reference $A$1', () => {
    expect(tokenize('$A$1')[0]).toMatchObject({ kind: 'reference', value: '$A$1' })
  })

  it('parses mixed reference $A1', () => {
    expect(tokenize('$A1')[0].kind).toBe('reference')
  })

  it('parses range A1:B5', () => {
    expect(tokenize('A1:B5')[0]).toMatchObject({ kind: 'range', value: 'A1:B5' })
  })

  it('parses absolute range $A$1:$B$5', () => {
    expect(tokenize('$A$1:$B$5')[0]).toMatchObject({ kind: 'range', value: '$A$1:$B$5' })
  })
})

describe('tokenize — operators', () => {
  it('parses single-char operators (+ - * / ^ & = < > %)', () => {
    for (const op of ['+', '-', '*', '/', '^', '&', '=', '<', '>', '%']) {
      const tokens = tokenize(op)
      expect(tokens[0]).toMatchObject({ kind: 'op', value: op })
    }
  })

  it('parses two-char operators (<= >= <>)', () => {
    expect(tokenize('<=')[0]).toMatchObject({ kind: 'op', value: '<=' })
    expect(tokenize('>=')[0]).toMatchObject({ kind: 'op', value: '>=' })
    expect(tokenize('<>')[0]).toMatchObject({ kind: 'op', value: '<>' })
  })

  it('prefers two-char ops over single (<=, not < then =)', () => {
    const tokens = tokenize('<=')
    expect(tokens.length).toBe(1)
    expect(tokens[0].value).toBe('<=')
  })
})

describe('tokenize — grouping', () => {
  it('parses lparen / rparen / comma', () => {
    expect(tokenize('(')[0].kind).toBe('lparen')
    expect(tokenize(')')[0].kind).toBe('rparen')
    expect(tokenize(',')[0].kind).toBe('comma')
  })
})

describe('tokenize — full expressions', () => {
  it('tokenizes SUM(A1:B5, 10)', () => {
    const tokens = tokenize('SUM(A1:B5, 10)')
    expect(tokens.map((t) => t.kind)).toEqual([
      'identifier',
      'lparen',
      'range',
      'comma',
      'number',
      'rparen',
    ])
  })

  it('tokenizes IF(A1 > 0, "yes", "no")', () => {
    const tokens = tokenize('IF(A1 > 0, "yes", "no")')
    expect(tokens.map((t) => t.kind)).toEqual([
      'identifier',
      'lparen',
      'reference',
      'op',
      'number',
      'comma',
      'string',
      'comma',
      'string',
      'rparen',
    ])
  })

  it('tokenizes #DIV/0! + 1 (error literal participates in expression)', () => {
    const tokens = tokenize('#DIV/0! + 1')
    expect(tokens.map((t) => t.kind)).toEqual(['error', 'op', 'number'])
  })
})

describe('tokenize — unexpected characters', () => {
  it('throws on unrecognized characters like ` or @', () => {
    expect(() => tokenize('`')).toThrow(/Unexpected character/)
    expect(() => tokenize('1 @ 2')).toThrow(/Unexpected character/)
  })
})
