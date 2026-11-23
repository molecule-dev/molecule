/**
 * molecule-only rule (tests): no assertion that an optional chain passes when its object is missing.
 *
 * `a?.b` reads `undefined` when `a` is `null` or `undefined`, and some matchers pass on
 * `undefined`: `expect(card?.querySelector('svg')).not.toBeNull()` passes when the card never
 * rendered, so the test cannot fail on the defect it was written for. 95 such assertions were
 * found across the workspace in Nov 2026, and the tests they guarded passed with the object
 * absent.
 *
 * Reported: `expect(<chain>)` (or `expect.soft`, with any message argument, through `!`, `as` and
 * `satisfies`) followed by a matcher that passes on `undefined`:
 * `.not.toBeNull()`, `.not.toBe(v)`, `.not.toEqual(v)`, `.not.toStrictEqual(v)` (v other than
 * `undefined`), `.not.toBeTruthy()`, `.not.toBeDefined()`, `.not.toBeInstanceOf(…)`,
 * `.not.toBeNaN()`, `.not.toBeTypeOf(t)` (t other than `'undefined'`), `.toBeUndefined()`,
 * `.toBeFalsy()`, `.toBe(undefined)`, `.toEqual(undefined)`, `.toStrictEqual(undefined)` and
 * `.toBeTypeOf('undefined')`. A matcher that fails on `undefined` (`.toBeNull()`, `.toBe(v)`,
 * `.not.toBeUndefined()`, `.toContain(…)` …) already fails when the object is missing.
 */

/** Matchers that pass on `undefined` when negated, unless their argument is `undefined`. */
const NEGATED_UNLESS_UNDEFINED = new Set(['toBe', 'toEqual', 'toStrictEqual'])
/** Matchers that pass on `undefined` when negated, whatever their argument. */
const NEGATED = new Set(['toBeNull', 'toBeTruthy', 'toBeDefined', 'toBeInstanceOf', 'toBeNaN'])
/** Matchers that pass on `undefined` as they are. */
const PLAIN = new Set(['toBeUndefined', 'toBeFalsy'])
/** Matchers that pass on `undefined` as they are when their argument is `undefined`. */
const PLAIN_IF_UNDEFINED = new Set(['toBe', 'toEqual', 'toStrictEqual'])

/**
 * Whether a node is the value `undefined` (the identifier or `void 0`).
 *
 * @param {object | undefined} node - The node.
 * @returns {boolean} Whether it is `undefined`.
 */
const isUndefined = (node) =>
  node !== undefined &&
  ((node.type === 'Identifier' && node.name === 'undefined') ||
    (node.type === 'UnaryExpression' && node.operator === 'void'))

/**
 * The expression under `!`, `as`, `satisfies` and `<T>` casts.
 *
 * @param {object} node - The node.
 * @returns {object} The inner expression.
 */
const unwrap = (node) => {
  let current = node
  while (
    current.type === 'TSNonNullExpression' ||
    current.type === 'TSAsExpression' ||
    current.type === 'TSSatisfiesExpression' ||
    current.type === 'TSTypeAssertion'
  )
    current = current.expression
  return current
}

/**
 * Whether a callee is `expect` or `expect.soft`.
 *
 * @param {object} callee - The callee node.
 * @returns {boolean} Whether it is.
 */
const isExpect = (callee) =>
  (callee.type === 'Identifier' && callee.name === 'expect') ||
  (callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'expect' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'soft')

/**
 * The name of a non-computed member property, or undefined.
 *
 * @param {object} member - A MemberExpression.
 * @returns {string | undefined} The name.
 */
const propertyName = (member) =>
  !member.computed && member.property.type === 'Identifier' ? member.property.name : undefined

/**
 * Whether a matcher call passes when the value is `undefined`.
 *
 * @param {string} matcher - The matcher's name.
 * @param {boolean} negated - Whether `.not` precedes it.
 * @param {object | undefined} argument - Its first argument.
 * @returns {boolean} Whether it passes on `undefined`.
 */
const passesOnUndefined = (matcher, negated, argument) => {
  if (negated) {
    if (NEGATED.has(matcher)) return true
    if (NEGATED_UNLESS_UNDEFINED.has(matcher)) return !isUndefined(argument)
    if (matcher === 'toBeTypeOf')
      return !(argument?.type === 'Literal' && argument.value === 'undefined')
    return false
  }
  if (PLAIN.has(matcher)) return true
  if (PLAIN_IF_UNDEFINED.has(matcher)) return isUndefined(argument)
  if (matcher === 'toBeTypeOf')
    return argument?.type === 'Literal' && argument.value === 'undefined'
  return false
}

/**
 * The text of a chain up to its first optional link (`a` in `a?.b.c`).
 *
 * @param {object} chain - The ChainExpression.
 * @param {object} sourceCode - The file's source code.
 * @returns {string} The object's source text.
 */
const optionalObject = (chain, sourceCode) => {
  let node = chain.expression
  let object
  while (node.type === 'MemberExpression' || node.type === 'CallExpression') {
    if (node.optional) object = node.type === 'MemberExpression' ? node.object : node.callee
    node = node.type === 'MemberExpression' ? node.object : node.callee
  }
  return object ? sourceCode.getText(object) : sourceCode.getText(chain)
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow assertions on an optional chain that pass when the object it reads is missing',
    },
    schema: [],
    messages: {
      vacuous:
        '`{{chain}}` reads undefined when `{{object}}` is missing, and `{{assertion}}` passes on undefined, so this assertion cannot fail when `{{object}}` is missing. Assert `{{object}}` first (`expect({{object}}).not.toBeNull()` for `T | null`, `.toBeDefined()` for `T | undefined`), then read it with `!.` or `.`. When the case expects `{{object}}` itself to be missing, assert that.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return
        const matcher = propertyName(node.callee)
        if (matcher === undefined) return
        let receiver = node.callee.object
        let negated = false
        if (receiver.type === 'MemberExpression' && propertyName(receiver) === 'not') {
          negated = true
          receiver = receiver.object
        }
        if (receiver.type !== 'CallExpression' || !isExpect(receiver.callee)) return
        const value = receiver.arguments[0]
        if (value === undefined || value.type === 'SpreadElement') return
        const chain = unwrap(value)
        if (chain.type !== 'ChainExpression') return
        if (!passesOnUndefined(matcher, negated, node.arguments[0])) return
        const assertion = `${negated ? '.not' : ''}.${matcher}(${node.arguments.map((a) => sourceCode.getText(a)).join(', ')})`
        context.report({
          node,
          messageId: 'vacuous',
          data: {
            chain: sourceCode.getText(chain),
            object: optionalObject(chain, sourceCode),
            assertion,
          },
        })
      },
    }
  },
}
