/**
 * `molecule-local/no-vacuous-optional-chain-assertion` (test files): no assertion on an optional
 * chain that passes when its object is missing.
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
 *
 * Also reported: `.toBe(<chain>)`, `.toEqual(<chain>)` and `.toStrictEqual(<chain>)` on a chain,
 * where the expected value is an optional chain too. Both read `undefined` when their objects are
 * missing, so `expect(config.preview?.proxy).toBe(config.server?.proxy)` passes when neither
 * `preview` nor `server` exists.
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
 * The optional chain a matcher argument is (under `!`, `as` and `satisfies`), or undefined.
 *
 * @param {object | undefined} node - The argument node.
 * @returns {object | undefined} The ChainExpression.
 */
const chainOf = (node) => {
  if (node === undefined || node.type === 'SpreadElement') return undefined
  const inner = unwrap(node)
  return inner.type === 'ChainExpression' ? inner : undefined
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
      bothChains:
        '`{{chain}}` and `{{expected}}` both read undefined when `{{object}}` and `{{expectedObject}}` are missing, so `{{assertion}}` passes when neither exists. Assert one of them first (`expect({{expectedObject}}).not.toBeNull()` for `T | null`, `.toBeDefined()` for `T | undefined`), then read it with `!.` or `.`.',
      bothChainsOneObject:
        '`{{chain}}` and `{{expected}}` both read undefined when `{{object}}` is missing, so `{{assertion}}` passes when it does not exist. Assert `{{object}}` first (`expect({{object}}).not.toBeNull()` for `T | null`, `.toBeDefined()` for `T | undefined`), then read it with `!.` or `.`.',
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
        const assertion = `${negated ? '.not' : ''}.${matcher}(${node.arguments.map((a) => sourceCode.getText(a)).join(', ')})`
        const expected = negated ? undefined : chainOf(node.arguments[0])
        if (expected !== undefined && PLAIN_IF_UNDEFINED.has(matcher)) {
          const object = optionalObject(chain, sourceCode)
          const expectedObject = optionalObject(expected, sourceCode)
          context.report({
            node,
            messageId: object === expectedObject ? 'bothChainsOneObject' : 'bothChains',
            data: {
              chain: sourceCode.getText(chain),
              object,
              expected: sourceCode.getText(expected),
              expectedObject,
              assertion,
            },
          })
          return
        }
        if (!passesOnUndefined(matcher, negated, node.arguments[0])) return
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
