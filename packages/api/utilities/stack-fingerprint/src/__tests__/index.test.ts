/**
 * Tests for `@molecule/api-stack-fingerprint`.
 *
 * Covers:
 * - Fingerprint stability: same error from different runs → same hash
 * - Different errors → different hashes
 * - Line / column number stripping (volatile across builds)
 * - V8 vs SpiderMonkey/Firefox parsing
 * - Anonymous function frames
 * - Eval frames (V8 + Firefox)
 * - tmp dir / build path / hash-suffix normalization
 * - Custom path normalizers
 * - Grouping by fingerprint with sample preservation
 */

import { describe, expect, it } from 'vitest'

import { fingerprintError } from '../fingerprintError.js'
import { groupErrors } from '../groupErrors.js'
import { normalizeFrame } from '../normalizeFrame.js'
import { parseStackFrames } from '../parseStackFrames.js'

const V8_STACK = `TypeError: Cannot read properties of undefined (reading 'foo')
    at handleRequest (/Users/alice/proj/src/handler.ts:42:13)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)
    at async Server.<anonymous> (/Users/alice/proj/src/server.ts:18:7)`

const V8_STACK_OTHER_MACHINE = `TypeError: Cannot read properties of undefined (reading 'bar')
    at handleRequest (/home/bob/proj/src/handler.ts:99:7)
    at processTicksAndRejections (node:internal/process/task_queues:101:5)
    at async Server.<anonymous> (/home/bob/proj/src/server.ts:21:9)`

const FIREFOX_STACK = `handleRequest@http://localhost:3000/src/handler.ts:42:13
processTicksAndRejections@node:internal/process/task_queues:96:5
@http://localhost:3000/src/server.ts:18:7`

describe('parseStackFrames', () => {
  it('parses V8-style frames with function + location', () => {
    const frames = parseStackFrames(V8_STACK)

    expect(frames).toHaveLength(3)
    expect(frames[0]).toMatchObject({
      function: 'handleRequest',
      file: '/Users/alice/proj/src/handler.ts',
      line: 42,
      column: 13,
      isEval: false,
      isNative: false,
    })
    expect(frames[1]).toMatchObject({
      function: 'processTicksAndRejections',
      file: 'node:internal/process/task_queues',
      line: 96,
      column: 5,
      isNative: true,
    })
  })

  it('parses anonymous frames in V8 stacks', () => {
    const frames = parseStackFrames(V8_STACK)
    expect(frames[2].function).toBe('<anonymous>')
    expect(frames[2].file).toBe('/Users/alice/proj/src/server.ts')
  })

  it('parses bare V8 frames with no function name', () => {
    const stack = `Error: boom
    at /tmp/runner.js:10:3`
    const frames = parseStackFrames(stack)
    expect(frames).toHaveLength(1)
    expect(frames[0]).toMatchObject({
      function: '<anonymous>',
      file: '/tmp/runner.js',
      line: 10,
      column: 3,
    })
  })

  it('parses SpiderMonkey/Firefox frames', () => {
    const frames = parseStackFrames(FIREFOX_STACK)

    expect(frames).toHaveLength(3)
    expect(frames[0]).toMatchObject({
      function: 'handleRequest',
      file: 'http://localhost:3000/src/handler.ts',
      line: 42,
      column: 13,
    })
    expect(frames[2].function).toBe('<anonymous>')
    expect(frames[2].file).toBe('http://localhost:3000/src/server.ts')
  })

  it('marks V8 eval frames', () => {
    const stack = `Error: boom
    at eval (eval at outer (/proj/src/runner.ts:1:1), <anonymous>:1:5)
    at outer (/proj/src/runner.ts:1:1)`
    const frames = parseStackFrames(stack)
    expect(frames[0].isEval).toBe(true)
    expect(frames[1].isEval).toBe(false)
  })

  it('marks Firefox eval frames', () => {
    const stack = `outer@http://example.com/a.js:1:1
@http://example.com/a.js > eval:1:5`
    const frames = parseStackFrames(stack)
    expect(frames[1].isEval).toBe(true)
  })

  it('returns [] for empty / null input', () => {
    expect(parseStackFrames(undefined)).toEqual([])
    expect(parseStackFrames(null)).toEqual([])
    expect(parseStackFrames('')).toEqual([])
    expect(parseStackFrames('   \n  \n')).toEqual([])
  })

  it('preserves unknown frame text in `raw`', () => {
    const stack = `something weird
that isn't a frame`
    // First line gets dropped as "header" since it has no `at` / `@`.
    const frames = parseStackFrames(stack)
    expect(frames).toHaveLength(1)
    expect(frames[0].function).toBe('<unknown>')
    expect(frames[0].raw).toBe("that isn't a frame")
  })

  it('strips `[as alias]` from V8 function names', () => {
    const stack = `Error: x
    at MyClass.handler [as onMessage] (/a/b.ts:1:1)`
    const frames = parseStackFrames(stack)
    expect(frames[0].function).toBe('MyClass.handler')
  })
})

describe('normalizeFrame', () => {
  it('strips line and column numbers (handled implicitly by omitting them)', () => {
    const [frame] = parseStackFrames(`Error: x
    at fn (/proj/src/a.ts:42:13)`)
    const normalized = normalizeFrame(frame)
    expect(normalized).not.toHaveProperty('line')
    expect(normalized).not.toHaveProperty('column')
  })

  it('strips macOS /private/var/folders tmp dirs', () => {
    const [frame] = parseStackFrames(`Error: x
    at fn (/private/var/folders/zz/abcdef/T/build123/src/a.ts:1:1)`)
    expect(normalizeFrame(frame).file).toBe('src/a.ts')
  })

  it('strips Linux /var/folders tmp dirs', () => {
    const [frame] = parseStackFrames(`Error: x
    at fn (/var/folders/zz/abcdef/T/build/src/a.ts:1:1)`)
    expect(normalizeFrame(frame).file).toBe('src/a.ts')
  })

  it('strips absolute paths up to /src/', () => {
    const [frame1] = parseStackFrames(`Error: x
    at fn (/Users/alice/proj/src/a.ts:1:1)`)
    const [frame2] = parseStackFrames(`Error: x
    at fn (/home/bob/different/proj/src/a.ts:9:9)`)
    expect(normalizeFrame(frame1).file).toBe('src/a.ts')
    expect(normalizeFrame(frame2).file).toBe('src/a.ts')
  })

  it('keeps node_modules-relative paths', () => {
    const [frame] = parseStackFrames(`Error: x
    at fn (/Users/alice/proj/node_modules/express/lib/router.js:42:13)`)
    expect(normalizeFrame(frame).file).toBe('node_modules/express/lib/router.js')
  })

  it('strips bundler hash suffixes', () => {
    const [frame1] = parseStackFrames(`Error: x
    at fn (/proj/dist/main.abc123def.js:1:1)`)
    const [frame2] = parseStackFrames(`Error: x
    at fn (/proj/dist/main-abc123def4567890.js:1:1)`)
    expect(normalizeFrame(frame1).file).toBe('dist/main.js')
    expect(normalizeFrame(frame2).file).toBe('dist/main.js')
  })

  it('strips Vite-style query strings', () => {
    const [frame] = parseStackFrames(`Error: x
    at fn (/proj/src/a.ts?t=12345:1:1)`)
    expect(normalizeFrame(frame).file).toBe('src/a.ts')
  })

  it('strips file:// scheme', () => {
    const [frame] = parseStackFrames(`Error: x
    at fn (file:///Users/alice/proj/src/a.ts:1:1)`)
    expect(normalizeFrame(frame).file).toBe('src/a.ts')
  })

  it('normalizes versioned node_modules dirs', () => {
    const [frame] = parseStackFrames(`Error: x
    at fn (/proj/node_modules/.pnpm/express@4.18.2/node_modules/express/lib/router.js:1:1)`)
    // After collapsing to last node_modules and stripping @version:
    expect(normalizeFrame(frame).file).toContain('express/lib/router.js')
    expect(normalizeFrame(frame).file).not.toContain('@4.18.2')
  })

  it('collapses eval frames to a single canonical token', () => {
    const [evalFrame] = parseStackFrames(`Error: x
    at eval (eval at outer (/proj/src/a.ts:1:1), <anonymous>:1:5)`)
    const normalized = normalizeFrame(evalFrame)
    expect(normalized.function).toBe('<eval>')
    expect(normalized.file).toBe('<eval>')
  })

  it('collapses Object. / Module. wrappers in function names', () => {
    const [frame] = parseStackFrames(`Error: x
    at Object.handler (/proj/src/a.ts:1:1)`)
    expect(normalizeFrame(frame).function).toBe('handler')
  })

  it('applies custom path normalizers in order', () => {
    const [frame] = parseStackFrames(`Error: x
    at fn (/proj/src/a.ts:1:1)`)
    const normalized = normalizeFrame(frame, {
      pathNormalizers: [(p) => p.replace(/^src\//, 'app/'), (p) => p.toUpperCase()],
    })
    expect(normalized.file).toBe('APP/A.TS')
  })
})

describe('fingerprintError', () => {
  it('produces a 40-char lowercase SHA-1 hex string', () => {
    const fp = fingerprintError({ type: 'Error', stack: V8_STACK })
    expect(fp).toMatch(/^[a-f0-9]{40}$/)
  })

  it('returns the same fingerprint across machines / runs (paths + line numbers vary)', () => {
    const a = fingerprintError({ type: 'TypeError', stack: V8_STACK })
    const b = fingerprintError({ type: 'TypeError', stack: V8_STACK_OTHER_MACHINE })
    expect(a).toBe(b)
  })

  it('returns the same fingerprint when only line / column noise differs', () => {
    const stackA = `Error: x
    at fn (/proj/src/a.ts:42:13)
    at other (/proj/src/b.ts:7:1)`
    const stackB = `Error: x
    at fn (/proj/src/a.ts:99:99)
    at other (/proj/src/b.ts:200:5)`
    expect(fingerprintError({ stack: stackA })).toBe(fingerprintError({ stack: stackB }))
  })

  it('different functions produce different fingerprints', () => {
    const stackA = `Error: x
    at handleRequest (/proj/src/a.ts:1:1)`
    const stackB = `Error: x
    at handleResponse (/proj/src/a.ts:1:1)`
    expect(fingerprintError({ stack: stackA })).not.toBe(fingerprintError({ stack: stackB }))
  })

  it('different files produce different fingerprints', () => {
    const stackA = `Error: x
    at fn (/proj/src/a.ts:1:1)`
    const stackB = `Error: x
    at fn (/proj/src/b.ts:1:1)`
    expect(fingerprintError({ stack: stackA })).not.toBe(fingerprintError({ stack: stackB }))
  })

  it('mixes type into the fingerprint by default', () => {
    const a = fingerprintError({ type: 'TypeError', stack: V8_STACK })
    const b = fingerprintError({ type: 'RangeError', stack: V8_STACK })
    expect(a).not.toBe(b)
  })

  it('omits type when includeType=false', () => {
    const a = fingerprintError({ type: 'TypeError', stack: V8_STACK }, { includeType: false })
    const b = fingerprintError({ type: 'RangeError', stack: V8_STACK }, { includeType: false })
    expect(a).toBe(b)
  })

  it('does NOT mix message into the fingerprint by default', () => {
    const stack = `Error: x
    at fn (/proj/src/a.ts:1:1)`
    const a = fingerprintError({ type: 'Error', message: 'User 17 not found', stack })
    const b = fingerprintError({ type: 'Error', message: 'User 42 not found', stack })
    expect(a).toBe(b)
  })

  it('mixes message in when includeMessage=true', () => {
    const stack = `Error: x
    at fn (/proj/src/a.ts:1:1)`
    const a = fingerprintError(
      { type: 'Error', message: 'User 17 not found', stack },
      { includeMessage: true },
    )
    const b = fingerprintError(
      { type: 'Error', message: 'User 42 not found', stack },
      { includeMessage: true },
    )
    expect(a).not.toBe(b)
  })

  it('respects topFrames option', () => {
    const stack = `Error: x
    at f1 (/proj/src/a.ts:1:1)
    at f2 (/proj/src/b.ts:1:1)
    at f3 (/proj/src/c.ts:1:1)
    at f4 (/proj/src/d.ts:1:1)
    at f5 (/proj/src/e.ts:1:1)
    at f6 (/proj/src/f.ts:1:1)`
    const stackTrimmedBelow3 = `Error: x
    at f1 (/proj/src/a.ts:1:1)
    at f2 (/proj/src/b.ts:1:1)
    at f3 (/proj/src/c.ts:1:1)`
    expect(fingerprintError({ stack }, { topFrames: 3 })).toBe(
      fingerprintError({ stack: stackTrimmedBelow3 }, { topFrames: 3 }),
    )
    expect(fingerprintError({ stack }, { topFrames: 3 })).not.toBe(
      fingerprintError({ stack }, { topFrames: 5 }),
    )
  })

  it('falls back to type+message hash when stack is empty', () => {
    const a = fingerprintError({ type: 'TimeoutError', message: 'timed out' })
    const b = fingerprintError({ type: 'TimeoutError', message: 'timed out' })
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{40}$/)
  })

  it('falls back to bare hash for missing stack with different types', () => {
    const a = fingerprintError({ type: 'TimeoutError' })
    const b = fingerprintError({ type: 'AbortError' })
    expect(a).not.toBe(b)
  })

  it('treats V8 and Firefox traces of the same call-site equivalently after type strip', () => {
    // Same logical function + file shape; line/col differ; engines differ.
    const v8 = `TypeError: x
    at handleRequest (http://localhost:3000/src/handler.ts:42:13)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)`
    const ff = `handleRequest@http://localhost:3000/src/handler.ts:99:99
processTicksAndRejections@node:internal/process/task_queues:101:9`
    expect(fingerprintError({ type: 'TypeError', stack: v8 })).toBe(
      fingerprintError({ type: 'TypeError', stack: ff }),
    )
  })

  it('treats anonymous frames consistently across runs', () => {
    const stackA = `Error: x
    at <anonymous> (/proj/src/a.ts:1:1)
    at Server.<anonymous> (/proj/src/b.ts:5:5)`
    const stackB = `Error: x
    at <anonymous> (/proj/src/a.ts:9:9)
    at Server.<anonymous> (/proj/src/b.ts:50:5)`
    expect(fingerprintError({ stack: stackA })).toBe(fingerprintError({ stack: stackB }))
  })

  it('treats different eval call-sites as the same group (eval is collapsed)', () => {
    const a = `Error: x
    at eval (eval at outer (/proj/src/a.ts:1:1), <anonymous>:1:5)
    at outer (/proj/src/a.ts:1:1)`
    const b = `Error: x
    at eval (eval at outer (/proj/src/a.ts:99:9), <anonymous>:42:1)
    at outer (/proj/src/a.ts:1:1)`
    expect(fingerprintError({ stack: a })).toBe(fingerprintError({ stack: b }))
  })

  it('honors custom path normalizers (e.g. strip a project root prefix)', () => {
    const stack = `Error: x
    at fn (/build/12345/output/src/a.ts:1:1)`
    const normalized = `Error: x
    at fn (/some/other/place/src/a.ts:9:9)`
    // Without help, both already strip to `src/a.ts` via the built-in /src/ rule.
    // Use a custom normalizer to also strip the leading `src/` for parity with
    // a hypothetical bundler that doesn't keep it.
    const opts = { pathNormalizers: [(p: string) => p.replace(/^src\//, '')] }
    expect(fingerprintError({ stack }, opts)).toBe(fingerprintError({ stack: normalized }, opts))
  })
})

describe('groupErrors', () => {
  it('groups errors by fingerprint and counts occurrences', () => {
    const errors = [
      { type: 'TypeError', stack: V8_STACK },
      { type: 'TypeError', stack: V8_STACK_OTHER_MACHINE }, // same group
      { type: 'RangeError', stack: V8_STACK }, // different group
      { type: 'TypeError', stack: V8_STACK }, // same as first
    ]
    const groups = groupErrors(errors)
    expect(groups).toHaveLength(2)
    expect(groups[0].count).toBe(3)
    expect(groups[1].count).toBe(1)
    expect(groups[1].sampleError.type).toBe('RangeError')
  })

  it('sorts groups by count descending', () => {
    const errors = [
      { type: 'A', stack: `Error: x\n    at fn1 (/proj/src/a.ts:1:1)` },
      { type: 'B', stack: `Error: x\n    at fn2 (/proj/src/a.ts:1:1)` },
      { type: 'B', stack: `Error: x\n    at fn2 (/proj/src/a.ts:1:1)` },
      { type: 'B', stack: `Error: x\n    at fn2 (/proj/src/a.ts:1:1)` },
    ]
    const groups = groupErrors(errors)
    expect(groups[0].count).toBe(3)
    expect(groups[0].sampleError.type).toBe('B')
    expect(groups[1].count).toBe(1)
    expect(groups[1].sampleError.type).toBe('A')
  })

  it('preserves the first-seen error as sampleError', () => {
    const errors = [
      { type: 'TypeError', message: 'first', stack: V8_STACK },
      { type: 'TypeError', message: 'second', stack: V8_STACK_OTHER_MACHINE },
    ]
    const [group] = groupErrors(errors)
    expect(group.sampleError.message).toBe('first')
  })

  it('ties on count break by first-seen order', () => {
    const errors = [
      { type: 'A', stack: `Error\n    at fnA (/proj/src/a.ts:1:1)` },
      { type: 'B', stack: `Error\n    at fnB (/proj/src/a.ts:1:1)` },
    ]
    const groups = groupErrors(errors)
    expect(groups[0].sampleError.type).toBe('A')
    expect(groups[1].sampleError.type).toBe('B')
  })

  it('returns empty array for empty input', () => {
    expect(groupErrors([])).toEqual([])
  })

  it('forwards options to fingerprintError', () => {
    const errors = [
      { type: 'TypeError', message: 'x=1', stack: V8_STACK },
      { type: 'TypeError', message: 'x=2', stack: V8_STACK },
    ]
    expect(groupErrors(errors)).toHaveLength(1)
    expect(groupErrors(errors, { includeMessage: true })).toHaveLength(2)
  })
})
