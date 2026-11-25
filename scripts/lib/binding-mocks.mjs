/**
 * A test that mocks a framework binding (`@molecule/app-react`, `-vue`, `-svelte`, `-solid`,
 * `-angular`) with a `vi.mock` factory replaces the whole module with what the factory returns.
 * Every component the test loads then reads the binding through that object, so a shared
 * component that starts using another binding export breaks every such test, in packages its
 * change never touched. On 2026-11-22 app-ui-angular's `AuthGuard` began importing `RoutedView`
 * from `@molecule/app-angular`; Angular reads a component's `imports` when its module loads, and
 * 13 tests of 11 unchanged packages failed with `No "RoutedView" export is defined on the mock`.
 *
 * So a factory mock of a binding returns an object that spreads the real module first
 * (`...(await importOriginal())`, `...(await vi.importActual(…))`, or a variable holding either),
 * and overrides only what the test needs. Vitest passes the real-module loader as the factory's first
 * parameter, so a call of that parameter counts under any name the test gives it (`load`), and a call
 * named `importOriginal` in a factory without that parameter does not: it throws when the mock loads. `check-framework-conformance.mjs` runs this over every
 * app package's tests.
 *
 * @module
 */
import ts from 'typescript'

/** The framework bindings a test may mock only on top of their real exports. */
export const FRAMEWORK_BINDING = /^@molecule\/app-(react|vue|svelte|solid|angular)$/

/** What to write instead, for the violation message. */
export const BINDING_MOCK_FIX =
  "start the factory from the real module and override only what the test needs: vi.mock('<binding>', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), … }))"

/**
 * Whether an expression reads the real module: a call of the factory's loader parameter
 * (`importOriginal()`), or `vi.importActual(…)`, either awaited or parenthesized.
 *
 * @param node - The expression.
 * @param loader - The name of the factory's first parameter, or null when it declares none.
 * @returns True when it does.
 */
function readsRealModule(node, loader) {
  let n = node
  while (ts.isParenthesizedExpression(n) || ts.isAwaitExpression(n) || ts.isAsExpression(n))
    n = n.expression
  if (!ts.isCallExpression(n)) return false
  const callee = n.expression
  if (ts.isIdentifier(callee)) return loader !== null && callee.text === loader
  return (
    ts.isPropertyAccessExpression(callee) &&
    callee.name.text === 'importActual' &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'vi'
  )
}

/**
 * Whether a factory returns an object that spreads the real module.
 *
 * @param factory - The `vi.mock` factory.
 * @returns True when every object it returns does.
 */
function spreadsRealModule(factory) {
  const first = factory.parameters[0]
  const loader = first && ts.isIdentifier(first.name) ? first.name.text : null
  const real = new Set()
  const objects = []
  if (ts.isBlock(factory.body)) {
    for (const statement of factory.body.statements) {
      if (ts.isVariableStatement(statement))
        for (const d of statement.declarationList.declarations)
          if (ts.isIdentifier(d.name) && d.initializer && readsRealModule(d.initializer, loader))
            real.add(d.name.text)
      if (ts.isReturnStatement(statement) && statement.expression)
        objects.push(statement.expression)
    }
  } else objects.push(factory.body)
  const unwrap = (e) => (ts.isParenthesizedExpression(e) ? unwrap(e.expression) : e)
  return (
    objects.length > 0 &&
    objects
      .map(unwrap)
      .every(
        (o) =>
          ts.isObjectLiteralExpression(o) &&
          o.properties.some(
            (p) =>
              ts.isSpreadAssignment(p) &&
              (readsRealModule(p.expression, loader) ||
                (ts.isIdentifier(p.expression) && real.has(p.expression.text))),
          ),
      )
  )
}

/**
 * The `vi.mock` calls in a test file that replace a framework binding without its real exports.
 *
 * @param text - The file's source.
 * @param fileName - Its name (`.tsx` parses JSX).
 * @returns Each such call's binding and 1-based line.
 */
export function partialBindingMocks(text, fileName) {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const out = []
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'vi' &&
      node.expression.name.text === 'mock' &&
      node.arguments.length >= 2 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      FRAMEWORK_BINDING.test(node.arguments[0].text)
    ) {
      const factory = node.arguments[1]
      const ok =
        (ts.isArrowFunction(factory) || ts.isFunctionExpression(factory)) &&
        spreadsRealModule(factory)
      if (!ok)
        out.push({
          binding: node.arguments[0].text,
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return out
}
