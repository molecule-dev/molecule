import type { StackFrame } from './types.js'

/**
 * Matches a V8 frame: `    at fn (file:line:col)`,
 * `    at file:line:col`, or `    at fn [as foo] (file:line:col)`.
 *
 * Capture groups:
 *   1: function name (optional — undefined for `at file:line:col`)
 *   2: location body (everything inside the parens, or the bare location)
 */
const V8_FRAME = /^\s*at\s+(?:(.+?)\s+\()?(.*?)\)?$/

/**
 * Matches a SpiderMonkey / Firefox frame: `fn@file:line:col`,
 * `@file:line:col` (anonymous), or `fn@file line col` after column-only
 * forms. Includes the `> eval` / `> Function` suffix used by inline
 * evals on older Firefox.
 */
const MOZ_FRAME = /^(.*?)@(.+?)$/

/**
 * Matches the trailing `:line:col`, `:line`, or no location on a path.
 *
 * Capture groups:
 *   1: file path
 *   2: line (optional)
 *   3: column (optional)
 */
const LOCATION = /^(.*?)(?::(\d+))?(?::(\d+))?$/

/**
 * Parse a multi-line stack-trace string into structured frames.
 *
 * Handles V8 (Node, Chromium, Edge) and SpiderMonkey (Firefox) frame
 * formats. Lines that don't match either format are still emitted as
 * `StackFrame`s with `function = '<unknown>'`, `file = ''`, and the
 * original line preserved in `raw` — fingerprinting still works on
 * them, it just loses structure.
 *
 * The first line of `stack` is tolerated and skipped if it looks like
 * an error header (`SomeError: message`) — V8's stack format includes
 * the error message at the top, while SpiderMonkey's does not.
 *
 * @param stack - Multi-line stack-trace text. Returns `[]` for empty
 *   / undefined input.
 * @returns Parsed frames in original (top-to-bottom) order.
 */
export const parseStackFrames = (stack: string | undefined | null): StackFrame[] => {
  if (!stack) {
    return []
  }

  const lines = stack
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return []
  }

  // V8 puts the error message on line 0 (e.g. `TypeError: foo`); skip it
  // unless the line itself looks like a frame.
  const firstIsHeader =
    !lines[0].startsWith('at ') && !lines[0].includes('@') && !/^\s*at\b/.test(lines[0])
  const start = firstIsHeader ? 1 : 0

  const frames: StackFrame[] = []
  for (let index = start; index < lines.length; index++) {
    const line = lines[index]
    const frame = parseV8Frame(line) ?? parseMozFrame(line) ?? parseUnknownFrame(line)
    frames.push(frame)
  }

  return frames
}

/**
 * Parse a single V8-style frame. Returns `null` if the line doesn't
 * match the V8 shape.
 */
const parseV8Frame = (raw: string): StackFrame | null => {
  if (!raw.startsWith('at ')) {
    return null
  }

  // Special case: `at <anonymous>` with nothing else.
  if (raw === 'at <anonymous>') {
    return {
      function: '<anonymous>',
      file: '',
      isEval: false,
      isNative: false,
      raw,
    }
  }

  const match = V8_FRAME.exec(raw)
  if (!match) {
    return null
  }

  // `match[1]` is the function name when parens are present;
  // when absent (bare `at file:line:col`), the whole location is in match[2].
  let fn = match[1]?.trim() ?? '<anonymous>'
  let location = match[2]?.trim() ?? ''

  // Strip leading `(` if it leaked into the location capture.
  if (location.startsWith('(')) {
    location = location.slice(1)
  }

  let isEval = false
  // V8 eval frames look like:
  //   at eval (eval at outer (file.js:1:1), <anonymous>:1:1)
  if (fn === 'eval' || /\beval at\b/.test(location)) {
    isEval = true
    // Replace the location with the trailing `<anonymous>:line:col` if any.
    const innerEval = /eval at .+?, (.+)$/.exec(location)
    if (innerEval) {
      location = innerEval[1]
    }
  }

  // Strip `[as methodName]` aliases out of function names — they're
  // structurally identical to the underlying name.
  fn = fn.replace(/\s+\[as\s+[^\]]+\]\s*$/, '')

  // Bare-form: V8 sometimes emits `at file:line:col` (no function name).
  // In that case `fn` will be the location and `location` will be empty.
  if (!location && fn.includes(':')) {
    location = fn
    fn = '<anonymous>'
  }

  // Anonymous functions: V8 emits `at Object.<anonymous>` / `at <anonymous>`.
  if (fn === '<anonymous>' || fn.endsWith('.<anonymous>')) {
    fn = '<anonymous>'
  }

  const { file, line, column } = splitLocation(location)
  const isNative = file.startsWith('node:') || file === 'native' || /\(native\)/.test(raw)

  return {
    function: fn,
    file,
    line,
    column,
    isEval,
    isNative,
    raw,
  }
}

/**
 * Parse a single SpiderMonkey / Firefox frame. Returns `null` if the
 * line doesn't match the `fn@file:line:col` shape.
 */
const parseMozFrame = (raw: string): StackFrame | null => {
  if (!raw.includes('@')) {
    return null
  }

  const match = MOZ_FRAME.exec(raw)
  if (!match) {
    return null
  }

  let fn = match[1].trim()
  const rest = match[2].trim()

  let isEval = false
  let location = rest

  // Firefox marks evals with `> eval` / `> Function` between the
  // outer caller and the synthetic eval source. Form is either
  //   outer.js line 1 > eval:line:col   (older)
  //   outer.js > eval:line:col          (newer)
  const evalMatch = />\s*(?:eval|Function)(?:\s+|:)(.+)$/.exec(rest)
  if (evalMatch) {
    isEval = true
    location = evalMatch[1]
  }

  if (fn === '') {
    fn = '<anonymous>'
  }

  const { file, line, column } = splitLocation(location)
  const isNative = file.startsWith('node:') || file === 'native'

  return {
    function: fn,
    file,
    line,
    column,
    isEval,
    isNative,
    raw,
  }
}

/**
 * Fallback for lines we can't parse — preserve the raw text so the
 * fingerprint still depends on it.
 */
const parseUnknownFrame = (raw: string): StackFrame => ({
  function: '<unknown>',
  file: raw,
  isEval: false,
  isNative: false,
  raw,
})

/**
 * Split `path:line:column` into its parts. Tolerates Windows drive
 * letters (`C:\...`) and `file://` URLs by anchoring the split on the
 * trailing two `:NUMBER` groups.
 */
const splitLocation = (location: string): { file: string; line?: number; column?: number } => {
  const trimmed = location.trim()
  if (trimmed === '') {
    return { file: '' }
  }

  // Pull off trailing `:line:col` or `:line`.
  const trailing = /^(.*?)(?::(\d+))(?::(\d+))?$/.exec(trimmed)
  if (trailing) {
    return {
      file: trailing[1],
      line: Number(trailing[2]),
      column: trailing[3] ? Number(trailing[3]) : undefined,
    }
  }

  const single = LOCATION.exec(trimmed)
  if (single) {
    return {
      file: single[1] ?? trimmed,
      line: single[2] ? Number(single[2]) : undefined,
      column: single[3] ? Number(single[3]) : undefined,
    }
  }

  return { file: trimmed }
}
