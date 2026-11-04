/** Shared lexical masking for source inspection without executing a module. */

/** The characters after which a `/` starts a regex literal rather than a division. */
const REGEX_AFTER = new Set([
  '',
  '(',
  '[',
  '{',
  ',',
  ';',
  ':',
  '=',
  '!',
  '&',
  '|',
  '?',
  '+',
  '-',
  '*',
  '%',
  '^',
  '~',
  '<',
  '>',
  '}',
])

/**
 * A source with every comment and every string, template and regex literal blanked to spaces,
 * preserving offsets and newlines so a match's position still indexes the original source.
 *
 * A launch mentioned in prose is not a launch: a review proved scripts that only PRINT
 * `const browser = await chromium.launch()` — in a string, a comment and a template literal — and
 * a raw substring match refused all of them. Template `${…}` substitutions stay code (a `close()`
 * written there is a real cleanup path), nested braces are tracked so the substitution's end is
 * found, and regex literals are recognised by the token before them so a quote inside a character
 * class cannot blank the rest of the file.
 *
 * @param source - The script's source.
 * @returns The same text with literal/comment spans replaced by spaces.
 */
export function codeWithModuleSpecifiers(source: string): string {
  const out = source.split('')
  const blank = (from: number, to: number): void => {
    for (let i = from; i < to; i++) if (out[i] !== '\n') out[i] = ' '
  }
  type Frame =
    | { mode: 'code'; braces: number }
    | { mode: 'line' }
    | { mode: 'block' }
    | { mode: 'template' }
    | { mode: 'string'; quote: string; keep: boolean }
    | { mode: 'regex'; inClass: boolean }
  const stack: Frame[] = [{ mode: 'code', braces: 0 }]
  const top = (): Frame => stack[stack.length - 1]!
  /** The last non-whitespace CODE character: decides whether a `/` opens a regex. */
  let lastCode = ''
  /** The last identifier word and the word being read — a module specifier follows `from`. */
  let lastWord = ''
  let word = ''
  /** A specifier (`from 'playwright'`, `require('playwright')`) stays readable to provenance. */
  const specifierAhead = (): boolean =>
    (lastWord === 'from' && lastCode === 'm') ||
    (lastWord === 'import' && lastCode === 't') ||
    ((lastWord === 'require' || lastWord === 'import') && lastCode === '(')
  let i = 0
  while (i < source.length) {
    const frame = top()
    const char = source[i] ?? ''
    const next = source[i + 1]
    if (frame.mode === 'code') {
      if (char === '/' && next === '/') {
        stack.push({ mode: 'line' })
        blank(i, i + 2)
        i += 2
        continue
      }
      if (char === '/' && next === '*') {
        stack.push({ mode: 'block' })
        blank(i, i + 2)
        i += 2
        continue
      }
      if (char === "'" || char === '"') {
        stack.push({ mode: 'string', quote: char, keep: specifierAhead() })
        if (!specifierAhead()) out[i] = ' '
        i += 1
        continue
      }
      if (char === '`') {
        stack.push({ mode: 'template' })
        out[i] = ' '
        i += 1
        continue
      }
      if (char === '/' && REGEX_AFTER.has(lastCode)) {
        stack.push({ mode: 'regex', inClass: false })
        out[i] = ' '
        i += 1
        continue
      }
      if (frame.braces > 0) {
        if (char === '{') frame.braces += 1
        else if (char === '}') {
          frame.braces -= 1
          if (frame.braces === 0) {
            stack.pop()
            out[i] = ' '
            i += 1
            continue
          }
        }
      }
      if (/[\w$]/.test(char)) word += char
      else if (word !== '') {
        lastWord = word
        word = ''
      }
      if (!/\s/.test(char)) lastCode = char
      i += 1
      continue
    }
    if (frame.mode === 'line') {
      if (char === '\n') {
        stack.pop()
        i += 1
        continue
      }
      out[i] = ' '
      i += 1
      continue
    }
    if (frame.mode === 'block') {
      if (char === '*' && next === '/') {
        blank(i, i + 2)
        stack.pop()
        i += 2
        continue
      }
      if (char !== '\n') out[i] = ' '
      i += 1
      continue
    }
    if (frame.mode === 'string') {
      if (char === '\\') {
        if (!frame.keep) blank(i, i + 2)
        i += 2
        continue
      }
      if (char === frame.quote) {
        if (!frame.keep) out[i] = ' '
        stack.pop()
        // A string is an operand: the next `/` is division, not a regex.
        lastCode = 'x'
        i += 1
        continue
      }
      if (!frame.keep && char !== '\n') out[i] = ' '
      i += 1
      continue
    }
    if (frame.mode === 'template') {
      if (char === '\\') {
        blank(i, i + 2)
        i += 2
        continue
      }
      if (char === '`') {
        out[i] = ' '
        stack.pop()
        lastCode = 'x'
        i += 1
        continue
      }
      if (char === '$' && next === '{') {
        // The substitution is code: keep it visible and track its closing brace.
        blank(i, i + 2)
        stack.push({ mode: 'code', braces: 1 })
        lastCode = '{'
        i += 2
        continue
      }
      if (char !== '\n') out[i] = ' '
      i += 1
      continue
    }
    // Regex literal: blank it, honour escapes and character classes, then its flags.
    if (char === '\\') {
      blank(i, i + 2)
      i += 2
      continue
    }
    if (char === '[') frame.inClass = true
    else if (char === ']') frame.inClass = false
    else if (char === '/' && !frame.inClass) {
      out[i] = ' '
      stack.pop()
      lastCode = 'x'
      i += 1
      while (i < source.length && /[a-z]/i.test(source[i] ?? '')) {
        out[i] = ' '
        i += 1
      }
      continue
    }
    if (char !== '\n') out[i] = ' '
    i += 1
  }
  return out.join('')
}
