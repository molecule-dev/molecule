/**
 * `molecule-local/no-mock-returned-from-hook` (test files): no `beforeEach` or `beforeAll` callback
 * that returns a mock.
 *
 * Vitest treats a function returned by `beforeEach` or `beforeAll` as that hook's teardown and
 * calls it after the test (or the suite). A mock is a function, and `mockReset()`, `mockClear()`,
 * `mockImplementation()` and the other `mock*` setters return the mock itself, so
 * `beforeEach(() => execaMock.mockReset())` calls `execaMock()` with no arguments after every
 * test. With an implementation in place, that call runs it: a test that set
 * `execaMock.mockImplementation(realExeca)` failed after its assertions had passed, because the
 * teardown ran the real `execa` with no command (2026-11-28, mlcl `check-package-upgrades.test.ts`).
 * `vi.fn()` and `vi.spyOn()` return a mock too.
 *
 * Reported: a `beforeEach`/`beforeAll` callback (`vi.`/`test.` prefixed or not) whose concise
 * arrow body, or a top-level `return`, is a `mock*` call that returns the mock, `vi.fn(…)` or
 * `vi.spyOn(…)` (also through `jest.`). `mockRestore()` returns nothing, so it is not reported.
 * The fix puts the call in a block body; the autofix does that for a concise arrow body.
 */

/** Mock methods that return the mock itself (vitest `MockInstance`). */
const RETURNS_MOCK = new Set([
  'mockClear',
  'mockReset',
  'mockName',
  'mockImplementation',
  'mockImplementationOnce',
  'mockReturnThis',
  'mockReturnValue',
  'mockReturnValueOnce',
  'mockResolvedValue',
  'mockResolvedValueOnce',
  'mockRejectedValue',
  'mockRejectedValueOnce',
  'withImplementation',
])
/** `vi.<name>(…)` and `jest.<name>(…)` calls that return a mock. */
const CREATES_MOCK = new Set(['fn', 'spyOn'])
/** Hooks whose returned function is a teardown. */
const HOOKS = new Set(['beforeEach', 'beforeAll'])

/**
 * The name of a non-computed member property, or undefined.
 *
 * @param {object} member - A MemberExpression.
 * @returns {string | undefined} The name.
 */
const propertyName = (member) =>
  !member.computed && member.property.type === 'Identifier' ? member.property.name : undefined

/**
 * Whether a callee is `beforeEach`/`beforeAll`, bare or as a member (`vi.beforeEach`,
 * `test.beforeEach`).
 *
 * @param {object} callee - The callee node.
 * @returns {boolean} Whether it is.
 */
const isHook = (callee) =>
  (callee.type === 'Identifier' && HOOKS.has(callee.name)) ||
  (callee.type === 'MemberExpression' && HOOKS.has(propertyName(callee) ?? ''))

/**
 * The expression under `await`, `!`, `as`, `satisfies` and `<T>` casts.
 *
 * @param {object} node - The node.
 * @returns {object} The inner expression.
 */
const unwrap = (node) => {
  let current = node
  while (
    current.type === 'AwaitExpression' ||
    current.type === 'TSNonNullExpression' ||
    current.type === 'TSAsExpression' ||
    current.type === 'TSSatisfiesExpression' ||
    current.type === 'TSTypeAssertion'
  )
    current = current.type === 'AwaitExpression' ? current.argument : current.expression
  return current
}

/**
 * The text of the call that returns a mock, or undefined when the expression is not one.
 *
 * @param {object} expression - The returned expression.
 * @returns {string | undefined} The method or creator name (`mockReset`, `vi.fn`).
 */
const mockReturned = (expression) => {
  const call = unwrap(expression)
  if (call.type !== 'CallExpression' || call.callee.type !== 'MemberExpression') return undefined
  const name = propertyName(call.callee)
  if (name === undefined) return undefined
  if (RETURNS_MOCK.has(name)) return name
  const object = call.callee.object
  if (
    CREATES_MOCK.has(name) &&
    object.type === 'Identifier' &&
    (object.name === 'vi' || object.name === 'jest')
  )
    return `${object.name}.${name}`
  return undefined
}

export default {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Disallow returning a mock from beforeEach or beforeAll, which Vitest then calls as the teardown',
    },
    schema: [],
    messages: {
      returned:
        '`{{hook}}` returns the mock `{{call}}` returns, and Vitest calls a function a `{{hook}}` callback returns as its teardown, so the mock is called with no arguments after the test (its implementation runs). Put the call in a block body: `{{hook}}(() => { … })`.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    return {
      CallExpression(node) {
        if (!isHook(node.callee)) return
        const callback = node.arguments.find(
          (argument) =>
            argument.type === 'ArrowFunctionExpression' || argument.type === 'FunctionExpression',
        )
        if (callback === undefined) return
        const hook =
          node.callee.type === 'Identifier' ? node.callee.name : propertyName(node.callee)
        if (callback.body.type !== 'BlockStatement') {
          const call = mockReturned(callback.body)
          if (call === undefined) return
          const before = sourceCode.getTokenBefore(callback.body)
          context.report({
            node: callback.body,
            messageId: 'returned',
            data: { hook, call },
            // Only a body that follows `=>` directly: `() => (x)` keeps its parentheses outside
            // the body's range, and replacing the range would leave `({ x })`.
            fix:
              before?.value === '=>'
                ? (fixer) =>
                    fixer.replaceText(callback.body, `{\n${sourceCode.getText(callback.body)}\n}`)
                : undefined,
          })
          return
        }
        for (const statement of callback.body.body) {
          if (statement.type !== 'ReturnStatement' || statement.argument == null) continue
          const call = mockReturned(statement.argument)
          if (call === undefined) continue
          context.report({ node: statement, messageId: 'returned', data: { hook, call } })
        }
      },
    }
  },
}
