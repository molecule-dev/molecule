import { describe, expect, it } from 'vitest'

import { parseStackFrames } from '../parseStackFrames.js'

describe('parseStackFrames — empty / edge cases', () => {
  it('returns [] for undefined', () => {
    expect(parseStackFrames(undefined)).toEqual([])
  })

  it('returns [] for null', () => {
    expect(parseStackFrames(null)).toEqual([])
  })

  it('returns [] for empty string', () => {
    expect(parseStackFrames('')).toEqual([])
  })

  it('returns [] for whitespace-only', () => {
    expect(parseStackFrames('   \n\n   ')).toEqual([])
  })

  it('skips error header on line 0 (V8 format)', () => {
    const stack = `TypeError: foo is undefined
    at someFn (file.js:1:2)`
    const out = parseStackFrames(stack)
    expect(out).toHaveLength(1)
    expect(out[0].function).toBe('someFn')
  })

  it('does NOT skip line 0 when it looks like a frame', () => {
    // SpiderMonkey output has no header — first line is a frame.
    const out = parseStackFrames('someFn@file.js:1:2')
    expect(out).toHaveLength(1)
    expect(out[0].function).toBe('someFn')
  })
})

describe('parseStackFrames — V8 format', () => {
  it('parses standard "at fn (file:line:col)" frame', () => {
    const out = parseStackFrames(`Error: x
    at outerFn (/app/src/index.js:42:13)`)
    expect(out[0]).toMatchObject({
      function: 'outerFn',
      file: '/app/src/index.js',
      line: 42,
      column: 13,
      isEval: false,
      isNative: false,
    })
  })

  it('parses bare "at file:line:col" frame (no function name)', () => {
    const out = parseStackFrames(`Error: x
    at /app/src/index.js:42:13`)
    expect(out[0]).toMatchObject({
      function: '<anonymous>',
      file: '/app/src/index.js',
      line: 42,
      column: 13,
    })
  })

  it('parses "at <anonymous>" lone frame', () => {
    const out = parseStackFrames(`Error: x
    at <anonymous>`)
    expect(out[0].function).toBe('<anonymous>')
    expect(out[0].file).toBe('')
  })

  it('strips "[as methodName]" aliases from function names', () => {
    const out = parseStackFrames(`Error: x
    at Object.fn [as namedAlias] (/app/x.js:1:1)`)
    expect(out[0].function).toBe('Object.fn')
  })

  it('collapses "Object.<anonymous>" → "<anonymous>"', () => {
    const out = parseStackFrames(`Error: x
    at Object.<anonymous> (/app/x.js:1:1)`)
    expect(out[0].function).toBe('<anonymous>')
  })

  it('marks node: builtin modules as isNative', () => {
    const out = parseStackFrames(`Error: x
    at fn (node:internal/x:1:1)`)
    expect(out[0].isNative).toBe(true)
    expect(out[0].file).toBe('node:internal/x')
  })

  it('marks eval frames with isEval=true and unwraps inner source', () => {
    const out = parseStackFrames(`Error: x
    at eval (eval at outerFn (/app/x.js:1:1), <anonymous>:1:5)`)
    expect(out[0].isEval).toBe(true)
    expect(out[0].file).toBe('<anonymous>')
  })

  it('handles multiple frames in original order (top to bottom)', () => {
    const out = parseStackFrames(`Error: x
    at first (/a.js:1:1)
    at second (/b.js:2:2)
    at third (/c.js:3:3)`)
    expect(out.map((f) => f.function)).toEqual(['first', 'second', 'third'])
  })
})

describe('parseStackFrames — SpiderMonkey/Firefox format', () => {
  it('parses standard fn@file:line:col frame', () => {
    const out = parseStackFrames('someFn@/app/src/index.js:42:13')
    expect(out[0]).toMatchObject({
      function: 'someFn',
      file: '/app/src/index.js',
      line: 42,
      column: 13,
    })
  })

  it('parses anonymous @file:line:col frame', () => {
    const out = parseStackFrames('@/app/src/index.js:1:1')
    expect(out[0].function).toBe('<anonymous>')
    expect(out[0].file).toBe('/app/src/index.js')
  })

  it('marks Firefox "> eval" frames with isEval=true', () => {
    const out = parseStackFrames('fn@outer.js > eval:1:5')
    expect(out[0].isEval).toBe(true)
  })

  it('marks "node:" prefixed file as native (in moz format too)', () => {
    const out = parseStackFrames('fn@node:internal/x:1:1')
    expect(out[0].isNative).toBe(true)
  })
})

describe('parseStackFrames — fallback for unparseable lines', () => {
  it('emits <unknown> frames for malformed lines after a header', () => {
    // First line skipped as header (no 'at '/'@'); remaining lines are
    // parsed as frames. The unparseable middle line should land as
    // <unknown>, not be dropped.
    const out = parseStackFrames(`Error: header line
totally not a stack frame
    at goodFn (/a.js:1:1)`)
    expect(out).toHaveLength(2)
    expect(out[0].function).toBe('<unknown>')
    expect(out[0].raw).toBe('totally not a stack frame')
    expect(out[1].function).toBe('goodFn')
  })

  it('preserves the raw line for fingerprinting on unknown frames', () => {
    const out = parseStackFrames(`Error: x
garbage line one
garbage line two`)
    expect(out).toHaveLength(2)
    expect(out[0].raw).toBe('garbage line one')
    expect(out[1].raw).toBe('garbage line two')
  })
})

describe('parseStackFrames — location splitting', () => {
  it('extracts line + column when both present', () => {
    const out = parseStackFrames('Error: x\n    at fn (/a.js:42:13)')
    expect(out[0].line).toBe(42)
    expect(out[0].column).toBe(13)
  })

  it('extracts line only when column absent', () => {
    const out = parseStackFrames('Error: x\n    at fn (/a.js:42)')
    expect(out[0].line).toBe(42)
    expect(out[0].column).toBeUndefined()
  })

  it('coerces extracted line/column to numbers (not strings)', () => {
    const out = parseStackFrames('Error: x\n    at fn (/a.js:42:13)')
    expect(typeof out[0].line).toBe('number')
    expect(typeof out[0].column).toBe('number')
  })
})

describe('parseStackFrames — multi-line', () => {
  it('handles \\r\\n line endings (Windows)', () => {
    const stack = 'Error: x\r\n    at fn1 (/a.js:1:1)\r\n    at fn2 (/b.js:2:2)'
    const out = parseStackFrames(stack)
    expect(out).toHaveLength(2)
  })

  it('skips blank lines between frames', () => {
    const stack = `Error: x
    at fn1 (/a.js:1:1)


    at fn2 (/b.js:2:2)`
    const out = parseStackFrames(stack)
    expect(out).toHaveLength(2)
  })
})
