/**
 * Condition-expression evaluators for the workflow engine.
 *
 * A workflow `condition` step carries an author-provided `expression` string.
 * Two strategies are offered, so the UNSAFE one is never the silent default:
 *
 * - {@link safeEvaluateCondition} — the DEFAULT. A tiny, purpose-built
 *   expression interpreter that supports member access (`$.a.b`), comparisons
 *   (`===`, `!==`, `==`, `!=`, `>`, `>=`, `<`, `<=`), boolean logic
 *   (`&&`, `||`, `!`), unary minus, grouping, and literals. It does **not** use
 *   `new Function`/`eval`, cannot call functions, cannot assign, and blocks
 *   `__proto__`/`constructor`/`prototype` access — so a malicious expression
 *   has no way to execute arbitrary code.
 * - {@link unsafeEvaluateCondition} — OPT-IN only. Evaluates the expression as
 *   full, unsandboxed JavaScript via `new Function`. Only ever run expressions
 *   authored by TRUSTED developers/admins with this — never end-user input.
 *
 * Both return `false` (never throw) for an unparseable or throwing expression,
 * so a bad condition short-circuits the run rather than crashing it.
 *
 * @module
 */

/**
 * Signature for a pluggable condition evaluator. Return `true` to let the run
 * continue past the `condition` step, `false` to short-circuit it.
 *
 * @param expression - The author-provided condition expression.
 * @param context - The workflow context the expression is evaluated against (`$`).
 * @returns Whether the condition passed.
 */
export type ConditionEvaluator = (expression: string, context: Record<string, unknown>) => boolean

/** A lexer token produced by {@link tokenize}. */
type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }

/** Member keys that are never resolved, to keep the safe evaluator inert against prototype access. */
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Splits a condition expression into tokens; throws on an unexpected character. */
function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = src.length
  const isDigit = (c: string): boolean => c >= '0' && c <= '9'
  const isIdStart = (c: string): boolean =>
    (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'
  const isIdPart = (c: string): boolean => isIdStart(c) || isDigit(c)

  while (i < n) {
    const c = src[i]

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++
      continue
    }

    // String literal (single or double quoted, with basic escapes).
    if (c === '"' || c === "'") {
      const quote = c
      i++
      let s = ''
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < n) {
          const esc = src[i + 1]
          s += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc === 'r' ? '\r' : esc
          i += 2
        } else {
          s += src[i]
          i++
        }
      }
      if (i >= n) throw new Error('Unterminated string literal')
      i++ // consume closing quote
      tokens.push({ t: 'str', v: s })
      continue
    }

    // Number literal (integer or decimal).
    if (isDigit(c)) {
      let num = ''
      while (i < n && (isDigit(src[i]) || src[i] === '.')) {
        num += src[i]
        i++
      }
      tokens.push({ t: 'num', v: Number(num) })
      continue
    }

    // Identifier / keyword.
    if (isIdStart(c)) {
      let id = ''
      while (i < n && isIdPart(src[i])) {
        id += src[i]
        i++
      }
      tokens.push({ t: 'id', v: id })
      continue
    }

    // Multi-character operators.
    const three = src.slice(i, i + 3)
    if (three === '===' || three === '!==') {
      tokens.push({ t: 'op', v: three })
      i += 3
      continue
    }
    const two = src.slice(i, i + 2)
    if (
      two === '==' ||
      two === '!=' ||
      two === '>=' ||
      two === '<=' ||
      two === '&&' ||
      two === '||'
    ) {
      tokens.push({ t: 'op', v: two })
      i += 2
      continue
    }

    // Single-character operators / punctuation.
    if ('<>!().[]$-'.includes(c)) {
      tokens.push({ t: 'op', v: c })
      i++
      continue
    }

    throw new Error(`Unexpected character in expression: ${c}`)
  }

  return tokens
}

/** Reads `key` off `obj` without boxing primitives or touching prototype keys. */
function safeMember(obj: unknown, key: string): unknown {
  if (obj == null) return undefined
  if (BLOCKED_KEYS.has(key)) return undefined
  if (typeof obj === 'object' || typeof obj === 'string') {
    return (obj as Record<string, unknown>)[key]
  }
  return undefined
}

/**
 * Recursive-descent interpreter over the token stream. Evaluates directly
 * against `context` — it never builds callable code.
 */
function interpret(tokens: Token[], context: Record<string, unknown>): unknown {
  let p = 0

  const peek = (): Token | undefined => tokens[p]
  const isOp = (v: string): boolean => {
    const tok = tokens[p]
    return tok?.t === 'op' && tok.v === v
  }
  const expectOp = (v: string): void => {
    if (!isOp(v)) throw new Error(`Expected '${v}'`)
    p++
  }

  const parseOr = (): unknown => {
    let left = parseAnd()
    while (isOp('||')) {
      p++
      const right = parseAnd()
      left = left || right
    }
    return left
  }

  const parseAnd = (): unknown => {
    let left = parseEquality()
    while (isOp('&&')) {
      p++
      const right = parseEquality()
      left = left && right
    }
    return left
  }

  const parseEquality = (): unknown => {
    let left = parseRelational()
    while (isOp('===') || isOp('!==') || isOp('==') || isOp('!=')) {
      const op = (tokens[p] as { v: string }).v
      p++
      const right = parseRelational()
      if (op === '===') left = left === right
      else if (op === '!==') left = left !== right
      else if (op === '==') left = left == right
      else left = left != right
    }
    return left
  }

  const parseRelational = (): unknown => {
    let left = parseUnary()
    while (isOp('>=') || isOp('<=') || isOp('>') || isOp('<')) {
      const op = (tokens[p] as { v: string }).v
      p++
      const right = parseUnary()
      const a = left as number
      const b = right as number
      if (op === '>=') left = a >= b
      else if (op === '<=') left = a <= b
      else if (op === '>') left = a > b
      else left = a < b
    }
    return left
  }

  const parseUnary = (): unknown => {
    if (isOp('!')) {
      p++
      return !parseUnary()
    }
    if (isOp('-')) {
      p++
      return -(parseUnary() as number)
    }
    return parsePrimary()
  }

  const parsePrimary = (): unknown => {
    const tok = peek()
    if (!tok) throw new Error('Unexpected end of expression')

    if (isOp('(')) {
      p++
      const inner = parseOr()
      expectOp(')')
      return inner
    }

    if (isOp('$')) return parsePath()

    if (tok.t === 'num' || tok.t === 'str') {
      p++
      return tok.v
    }

    if (tok.t === 'id') {
      p++
      if (tok.v === 'true') return true
      if (tok.v === 'false') return false
      if (tok.v === 'null') return null
      if (tok.v === 'undefined') return undefined
      throw new Error(`Unknown identifier: ${tok.v}`)
    }

    throw new Error(`Unexpected token: ${tok.v}`)
  }

  const parsePath = (): unknown => {
    expectOp('$')
    let cur: unknown = context
    for (;;) {
      if (isOp('.')) {
        p++
        const prop = peek()
        if (!prop || prop.t !== 'id') throw new Error('Expected property name after "."')
        p++
        cur = safeMember(cur, prop.v)
      } else if (isOp('[')) {
        p++
        const key = parseOr()
        expectOp(']')
        cur = safeMember(cur, String(key))
      } else {
        break
      }
    }
    return cur
  }

  const result = parseOr()
  if (p !== tokens.length) throw new Error('Unexpected trailing tokens in expression')
  return result
}

/**
 * Safely evaluates a workflow condition expression WITHOUT `new Function`/`eval`.
 *
 * Supports member access against the context (`$.a.b`, `$.list[0]`), comparisons,
 * boolean logic, unary `!`/`-`, grouping, and literals. Function calls,
 * assignments, and arbitrary JavaScript are unsupported — such an expression is
 * unparseable and evaluates to `false` rather than executing. An unparseable or
 * throwing expression counts as a non-matching condition.
 *
 * @param expression - The condition expression to evaluate.
 * @param context - The workflow context (bound to `$`).
 * @returns `true` if the expression is truthy, otherwise `false`.
 */
export const safeEvaluateCondition: ConditionEvaluator = (expression, context) => {
  try {
    return Boolean(interpret(tokenize(expression), context))
  } catch (_error) {
    // Unparseable/unsupported syntax is treated as a non-matching condition — the
    // documented semantics: a bad condition short-circuits the run, never crashes it.
    return false
  }
}

/**
 * UNSAFE: evaluates a workflow condition expression as full, unsandboxed
 * JavaScript via `new Function`. This is arbitrary code execution in the API
 * process — only run expressions authored by TRUSTED developers/admins, NEVER
 * end-user input. Opt in explicitly via `EngineOptions.allowUnsafeConditionEval`;
 * it is never the default. A throwing or unparseable expression counts as `false`.
 *
 * @param expression - The condition expression to evaluate as JavaScript.
 * @param context - The workflow context (bound to `$`).
 * @returns `true` if the expression is truthy, otherwise `false`.
 */
export const unsafeEvaluateCondition: ConditionEvaluator = (expression, context) => {
  try {
    const fn = new Function('$', `return (${expression})`)
    return Boolean(fn(context))
  } catch (_error) {
    // An unparseable or throwing expression counts as a non-matching condition — safe to suppress.
    return false
  }
}
