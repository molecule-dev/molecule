/**
 * Recursive-descent parser for formula expressions.
 *
 * Produces an AST consumable by the evaluator. Operator precedence
 * follows Excel:
 *
 *   1. `:` (range) — handled at tokenizer level
 *   2. unary `+`/`-`
 *   3. `%` (postfix)
 *   4. `^`
 *   5. `*`, `/`
 *   6. `+`, `-`
 *   7. `&`
 *   8. `=`, `<>`, `<`, `<=`, `>`, `>=`
 *
 * Pure function — no I/O, no globals.
 *
 * @module
 */

import { parseCellRange, parseCellReference } from './references.js'
import { tokenize } from './tokenizer.js'
import type { Token } from './tokenizer.js'
import type { AstNode, BinaryOperator } from './types.js'

/**
 * Parse a formula string into an AST.
 *
 * @param input - Formula text (with or without a leading `=`).
 * @returns Root AST node.
 */
export function parseFormula(input: string): AstNode {
  const body = input.trimStart().startsWith('=') ? input.trimStart().slice(1) : input
  const tokens = tokenize(body)
  if (tokens.length === 0) {
    throw new Error('Empty formula')
  }
  const parser = new Parser(tokens)
  const node = parser.parseExpression()
  if (!parser.atEnd()) {
    throw new Error(
      `Unexpected token '${parser.peek()!.value}' at position ${parser.peek()!.position}`,
    )
  }
  return node
}

class Parser {
  private pos = 0
  constructor(private readonly tokens: Token[]) {}

  atEnd(): boolean {
    return this.pos >= this.tokens.length
  }

  peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private consume(): Token {
    const t = this.tokens[this.pos]
    if (!t) throw new Error('Unexpected end of formula')
    this.pos++
    return t
  }

  parseExpression(): AstNode {
    return this.parseComparison()
  }

  private parseComparison(): AstNode {
    let left = this.parseConcat()
    while (true) {
      const t = this.peek()
      if (
        t?.kind === 'op' &&
        (t.value === '=' ||
          t.value === '<>' ||
          t.value === '<' ||
          t.value === '<=' ||
          t.value === '>' ||
          t.value === '>=')
      ) {
        this.consume()
        const right = this.parseConcat()
        left = { kind: 'binary', op: t.value as BinaryOperator, left, right }
      } else {
        break
      }
    }
    return left
  }

  private parseConcat(): AstNode {
    let left = this.parseAddSub()
    while (true) {
      const t = this.peek()
      if (t?.kind === 'op' && t.value === '&') {
        this.consume()
        const right = this.parseAddSub()
        left = { kind: 'binary', op: '&', left, right }
      } else {
        break
      }
    }
    return left
  }

  private parseAddSub(): AstNode {
    let left = this.parseMulDiv()
    while (true) {
      const t = this.peek()
      if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
        this.consume()
        const right = this.parseMulDiv()
        left = { kind: 'binary', op: t.value as BinaryOperator, left, right }
      } else {
        break
      }
    }
    return left
  }

  private parseMulDiv(): AstNode {
    let left = this.parsePower()
    while (true) {
      const t = this.peek()
      if (t?.kind === 'op' && (t.value === '*' || t.value === '/')) {
        this.consume()
        const right = this.parsePower()
        left = { kind: 'binary', op: t.value as BinaryOperator, left, right }
      } else {
        break
      }
    }
    return left
  }

  private parsePower(): AstNode {
    const left = this.parsePercent()
    const t = this.peek()
    if (t?.kind === 'op' && t.value === '^') {
      this.consume()
      const right = this.parsePower() // right-associative
      return { kind: 'binary', op: '^', left, right }
    }
    return left
  }

  private parsePercent(): AstNode {
    const operand = this.parseUnary()
    const t = this.peek()
    if (t?.kind === 'op' && t.value === '%') {
      this.consume()
      return { kind: 'unary', op: '%', operand }
    }
    return operand
  }

  private parseUnary(): AstNode {
    const t = this.peek()
    if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
      this.consume()
      const operand = this.parseUnary()
      return { kind: 'unary', op: t.value === '+' ? '+' : '-', operand }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): AstNode {
    const t = this.consume()
    switch (t.kind) {
      case 'number':
        return { kind: 'number', value: Number.parseFloat(t.value) }
      case 'string':
        return { kind: 'string', value: t.value }
      case 'boolean':
        return { kind: 'boolean', value: t.value === 'TRUE' }
      case 'error':
        return { kind: 'errorLiteral', code: t.errorCode! }
      case 'reference': {
        const coord = parseCellReference(t.value)
        if (!coord) {
          throw new Error(`Invalid reference '${t.value}' at position ${t.position}`)
        }
        return { kind: 'reference', coord, text: t.value }
      }
      case 'range': {
        const range = parseCellRange(t.value)
        if (!range) {
          throw new Error(`Invalid range '${t.value}' at position ${t.position}`)
        }
        return { kind: 'range', range, text: t.value }
      }
      case 'identifier': {
        // Function call: identifier followed by '('
        const next = this.peek()
        if (next?.kind === 'lparen') {
          this.consume() // (
          const args: AstNode[] = []
          if (this.peek()?.kind !== 'rparen') {
            args.push(this.parseExpression())
            while (this.peek()?.kind === 'comma') {
              this.consume()
              args.push(this.parseExpression())
            }
          }
          const close = this.consume()
          if (close.kind !== 'rparen') {
            throw new Error(`Expected ')' at position ${close.position}`)
          }
          return { kind: 'call', name: t.value.toUpperCase(), args }
        }
        // Bare identifier — treat as #NAME? at evaluation time
        return { kind: 'call', name: t.value.toUpperCase(), args: [] }
      }
      case 'lparen': {
        const inner = this.parseExpression()
        const close = this.consume()
        if (close.kind !== 'rparen') {
          throw new Error(`Expected ')' at position ${close.position}`)
        }
        return inner
      }
      default:
        throw new Error(`Unexpected token '${t.value}' at position ${t.position}`)
    }
  }
}
