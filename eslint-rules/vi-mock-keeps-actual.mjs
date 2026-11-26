/**
 * Require Vitest mocks of Molecule modules to retain the module's real exports.
 *
 * A factory passed to `vi.mock` or `vi.doMock` replaces the whole module. Starting the returned
 * object with the real module prevents a shared package export from disappearing from unrelated
 * tests when the package grows. The test may override any real export after that spread; the spread
 * must come first, because a later one replaces the stubs before it with the real exports.
 *
 * @module
 */

const MOLECULE_MODULE = /^@molecule\/.+/
const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
])

/**
 * The string a module specifier argument names: a string literal, or a template literal with no
 * substitutions.
 *
 * @param {object | undefined} node - The argument.
 * @returns {string | null} The specifier, or null for anything computed.
 */
function specifierText(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0].value.cooked
  return null
}

/**
 * Remove transparent TypeScript and parenthesis wrappers from an expression.
 *
 * @param {object} node - The ESTree expression.
 * @returns {object} The unwrapped expression.
 */
function unwrapExpression(node) {
  let current = node
  while (
    current &&
    (current.type === 'ChainExpression' ||
      current.type === 'TSAsExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'ParenthesizedExpression')
  )
    current = current.expression
  return current
}

/**
 * Return a simple factory parameter's name.
 *
 * @param {object | undefined} parameter - The factory parameter.
 * @returns {string | null} The identifier name, or null for a destructured parameter.
 */
function parameterName(parameter) {
  let current = parameter
  if (current?.type === 'AssignmentPattern') current = current.left
  return current?.type === 'Identifier' ? current.name : null
}

/**
 * Whether an expression is a call to the factory's real-module loader or to `vi.importActual` for
 * the mocked module.
 *
 * @param {object} expression - The expression to inspect.
 * @param {string | null} loader - The first factory parameter's name.
 * @param {string} specifier - The mocked module specifier.
 * @returns {boolean} True when the expression reads the same real module.
 */
function readsRealModule(expression, loader, specifier) {
  let node = unwrapExpression(expression)
  if (node?.type === 'AwaitExpression') node = unwrapExpression(node.argument)
  if (node?.type !== 'CallExpression') return false

  const callee = unwrapExpression(node.callee)
  if (callee?.type === 'Identifier') return loader !== null && callee.name === loader
  return (
    callee?.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'vi' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'importActual' &&
    node.arguments.length >= 1 &&
    specifierText(node.arguments[0]) === specifier
  )
}

/**
 * Walk a factory body without entering a nested function.
 *
 * @param {object} node - The node to walk.
 * @param {object} sourceCode - ESLint's source code object.
 * @param {(node: object) => void} visit - The visitor.
 * @param {object} factory - The outer factory function.
 * @returns {void}
 */
function walkFactory(node, sourceCode, visit, factory) {
  if (!node || (node !== factory && FUNCTION_TYPES.has(node.type))) return
  visit(node)
  for (const key of sourceCode.visitorKeys?.[node.type] ?? []) {
    const child = node[key]
    if (Array.isArray(child))
      for (const item of child) walkFactory(item, sourceCode, visit, factory)
    else walkFactory(child, sourceCode, visit, factory)
  }
}

/**
 * Get the object expressions a returned expression can directly name.
 *
 * @param {object} expression - A returned expression.
 * @param {Map<string, object>} variables - Variables declared in the factory body.
 * @returns {Array<object>} Object expressions, or an unknown marker.
 */
function returnedObjects(expression, variables) {
  let node = unwrapExpression(expression)
  if (node?.type === 'ObjectExpression') return [node]
  if (node?.type === 'Identifier' && variables.has(node.name))
    return returnedObjects(variables.get(node.name), variables)
  if (node?.type === 'ConditionalExpression')
    return [
      ...returnedObjects(node.consequent, variables),
      ...returnedObjects(node.alternate, variables),
    ]
  return [{ unknown: true }]
}

/**
 * Inspect the factory's returned objects and real-module aliases.
 *
 * @param {object} factory - The mock factory function.
 * @param {object} sourceCode - ESLint's source code object.
 * @param {string} specifier - The mocked module specifier.
 * @returns {{ loader: string | null, returns: object[], variables: Map<string, object>, real: Set<string> }}
 *   The factory data.
 */
function factoryData(factory, sourceCode, specifier) {
  const loader = parameterName(factory.params[0])
  const variables = new Map()
  const returned = []

  if (factory.body.type === 'BlockStatement') {
    walkFactory(
      factory.body,
      sourceCode,
      (node) => {
        if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init)
          variables.set(node.id.name, node.init)
        if (node.type === 'ReturnStatement' && node.argument) returned.push(node.argument)
      },
      factory,
    )
  } else returned.push(factory.body)

  const real = new Set()
  for (const [name, initializer] of variables)
    if (readsRealModule(initializer, loader, specifier)) real.add(name)

  return { loader, returns: returned, variables, real }
}

/**
 * Whether an object starts with a spread of the real module.
 *
 * @param {object} object - An ESTree ObjectExpression.
 * @param {{ loader: string | null, real: Set<string> }} data - Factory loader data.
 * @param {string} specifier - The mocked module specifier.
 * @returns {boolean} True when the first property spreads the real module.
 */
function spreadsRealModule(object, data, specifier) {
  const first = object.properties[0]
  return (
    first?.type === 'SpreadElement' &&
    (readsRealModule(first.argument, data.loader, specifier) ||
      (first.argument.type === 'Identifier' && data.real.has(first.argument.name)))
  )
}

/**
 * Whether a mock factory preserves the real module in every object it can return.
 *
 * @param {object} factory - The mock factory function.
 * @param {object} sourceCode - ESLint's source code object.
 * @param {string} specifier - The mocked module specifier.
 * @returns {boolean} True when every returned object spreads the real module.
 */
function keepsActual(factory, sourceCode, specifier) {
  const data = factoryData(factory, sourceCode, specifier)
  const objects = data.returns.flatMap((expression) => returnedObjects(expression, data.variables))
  return (
    objects.length > 0 &&
    objects.every((object) => !object.unknown && spreadsRealModule(object, data, specifier))
  )
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require @molecule Vitest mocks to keep the real module exports',
    },
    schema: [],
    messages: {
      keepActual:
        "Mock '{{specifier}}' from the real module, spread first, and override only what the test needs: vi.mock('{{specifier}}', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), … }))",
    },
  },

  /**
   * Build the rule visitor.
   *
   * @param {object} context - ESLint rule context.
   * @returns {object} The visitor map.
   */
  create(context) {
    const sourceCode = context.sourceCode
    return {
      CallExpression(node) {
        const callee = node.callee
        if (
          callee?.type !== 'MemberExpression' ||
          callee.computed ||
          callee.object.type !== 'Identifier' ||
          callee.object.name !== 'vi' ||
          callee.property.type !== 'Identifier' ||
          !['mock', 'doMock'].includes(callee.property.name) ||
          node.arguments.length < 2
        )
          return

        const specifier = specifierText(node.arguments[0])
        if (specifier === null || !MOLECULE_MODULE.test(specifier)) return

        const factory = node.arguments[1]
        if (!FUNCTION_TYPES.has(factory.type)) return
        if (keepsActual(factory, sourceCode, specifier)) return

        context.report({
          node,
          messageId: 'keepActual',
          data: { specifier },
        })
      },
    }
  },
}
