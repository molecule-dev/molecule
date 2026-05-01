/**
 * Formula tokenizer.
 *
 * Lexes a formula string into a flat token stream consumable by the
 * recursive-descent parser. Pure function — no I/O, no globals.
 *
 * @module
 */

import type { FormulaErrorCode } from './types.js'

/**
 * Lexical token kinds.
 */
export type TokenKind =
  | 'number'
  | 'string'
  | 'boolean'
  | 'error'
  | 'identifier'
  | 'reference'
  | 'range'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'

/**
 * Lexical token. `value` is the raw source text; `op` carries the
 * normalized operator string for `kind: 'op'` tokens.
 */
export interface Token {
  readonly kind: TokenKind
  readonly value: string
  readonly position: number
  readonly errorCode?: FormulaErrorCode
}

const ERROR_CODES: ReadonlyArray<FormulaErrorCode> = [
  '#DIV/0!',
  '#VALUE!',
  '#REF!',
  '#NAME?',
  '#NUM!',
  '#N/A',
  '#CIRC!',
]

const TWO_CHAR_OPS = new Set(['<=', '>=', '<>'])
const SINGLE_OPS = new Set(['+', '-', '*', '/', '^', '&', '=', '<', '>', '%'])

/**
 * Tokenize a formula string. The leading `=` (if present) is stripped
 * by the caller — pass the *body* of the formula here.
 *
 * @param input - Raw formula text (no leading `=`).
 * @returns Flat token list.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]!

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }

    // String literal
    if (ch === '"') {
      const start = i
      i++
      let value = ''
      while (i < input.length) {
        const c = input[i]!
        if (c === '"') {
          // Escaped quote ""
          if (input[i + 1] === '"') {
            value += '"'
            i += 2
            continue
          }
          break
        }
        value += c
        i++
      }
      if (input[i] !== '"') {
        throw new Error(`Unterminated string literal at position ${start}`)
      }
      i++ // closing quote
      tokens.push({ kind: 'string', value, position: start })
      continue
    }

    // Error literal (`#DIV/0!`, etc.)
    if (ch === '#') {
      const start = i
      let matched: FormulaErrorCode | null = null
      for (const code of ERROR_CODES) {
        if (input.startsWith(code, i)) {
          matched = code
          break
        }
      }
      if (matched) {
        tokens.push({
          kind: 'error',
          value: matched,
          position: start,
          errorCode: matched,
        })
        i += matched.length
        continue
      }
      throw new Error(`Unrecognized error code at position ${start}`)
    }

    // Number literal — integer or decimal, optional exponent.
    if (isDigit(ch) || (ch === '.' && isDigit(input[i + 1] ?? ''))) {
      const start = i
      while (i < input.length && isDigit(input[i]!)) i++
      if (input[i] === '.') {
        i++
        while (i < input.length && isDigit(input[i]!)) i++
      }
      if (input[i] === 'e' || input[i] === 'E') {
        i++
        if (input[i] === '+' || input[i] === '-') i++
        while (i < input.length && isDigit(input[i]!)) i++
      }
      tokens.push({
        kind: 'number',
        value: input.slice(start, i),
        position: start,
      })
      continue
    }

    // Identifier / reference / range / boolean
    if (isLetter(ch) || ch === '$' || ch === '_') {
      const start = i
      // Consume an identifier-like blob: letters, digits, $, :, _, .
      while (
        i < input.length &&
        (isLetter(input[i]!) ||
          isDigit(input[i]!) ||
          input[i] === '$' ||
          input[i] === '_' ||
          input[i] === '.' ||
          input[i] === ':')
      ) {
        i++
      }
      const text = input.slice(start, i)
      if (/^TRUE$/i.test(text)) {
        tokens.push({ kind: 'boolean', value: 'TRUE', position: start })
        continue
      }
      if (/^FALSE$/i.test(text)) {
        tokens.push({ kind: 'boolean', value: 'FALSE', position: start })
        continue
      }
      // Range like A1:B5
      if (/^\$?[A-Za-z]+\$?\d+:\$?[A-Za-z]+\$?\d+$/.test(text)) {
        tokens.push({ kind: 'range', value: text, position: start })
        continue
      }
      // Single reference like A1, $A$1
      if (/^\$?[A-Za-z]+\$?\d+$/.test(text)) {
        tokens.push({ kind: 'reference', value: text, position: start })
        continue
      }
      // Otherwise treat as function/identifier name
      tokens.push({ kind: 'identifier', value: text, position: start })
      continue
    }

    // Two-char operators
    if (i + 1 < input.length && TWO_CHAR_OPS.has(input.slice(i, i + 2))) {
      tokens.push({ kind: 'op', value: input.slice(i, i + 2), position: i })
      i += 2
      continue
    }

    // Single-char operators
    if (SINGLE_OPS.has(ch)) {
      tokens.push({ kind: 'op', value: ch, position: i })
      i++
      continue
    }

    if (ch === '(') {
      tokens.push({ kind: 'lparen', value: '(', position: i })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen', value: ')', position: i })
      i++
      continue
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma', value: ',', position: i })
      i++
      continue
    }

    throw new Error(`Unexpected character '${ch}' at position ${i}`)
  }
  return tokens
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isLetter(ch: string): boolean {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')
}
