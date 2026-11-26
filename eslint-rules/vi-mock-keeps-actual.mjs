/**
 * Require Vitest mocks of Molecule modules to retain the module's real exports.
 *
 * A factory passed to `vi.mock` or `vi.doMock` replaces the whole module. Starting the returned
 * object with the real module prevents a shared package export from disappearing from unrelated
 * tests when the package grows. The test may override any real export after that spread.
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
    node.arguments[0].type === 'Literal' &&
    node.arguments[0].value === specifier
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
 * Whether an object starts with, or otherwise contains, a spread of the real module.
 *
 * @param {object} object - An ESTree ObjectExpression.
 * @param {{ loader: string | null, real: Set<string> }} data - Factory loader data.
 * @param {string} specifier - The mocked module specifier.
 * @returns {boolean} True when the real module is spread into the object.
 */
function spreadsRealModule(object, data, specifier) {
  return object.properties.some(
    (property) =>
      property.type === 'SpreadElement' &&
      (readsRealModule(property.argument, data.loader, specifier) ||
        (property.argument.type === 'Identifier' && data.real.has(property.argument.name))),
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
        "Mock '{{specifier}}' from the real module and override only what the test needs: vi.mock('{{specifier}}', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), … }))",
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

        const module = node.arguments[0]
        if (module.type !== 'Literal' || typeof module.value !== 'string') return
        if (!MOLECULE_MODULE.test(module.value)) return

        const factory = node.arguments[1]
        if (!FUNCTION_TYPES.has(factory.type)) return
        if (keepsActual(factory, sourceCode, module.value)) return

        context.report({
          node,
          messageId: 'keepActual',
          data: { specifier: module.value },
        })
      },
    }
  },
}
