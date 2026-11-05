/**
 * Read literal module references with the caller's TypeScript parser.
 * Static declarations and unconditional top-level calls are eager. Function
 * bodies, feature guards and caught calls remain optional. This is syntax
 * analysis, not execution of arbitrary call graphs.
 *
 * @param text - Built JavaScript, never executed.
 * @param ts - The installed TypeScript compiler.
 * @returns Sets of all and eager literal references.
 */
export function moduleImports(text, ts) {
  const source = ts.createSourceFile(
    'built.js',
    text,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.JS,
  )
  const handledDynamic = new Set()
  const markPromise = (node) => {
    if (ts.isParenthesizedExpression(node)) return markPromise(node.expression)
    if (!ts.isCallExpression(node)) return
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) handledDynamic.add(node)
    else if (ts.isPropertyAccessExpression(node.expression)) markPromise(node.expression.expression)
  }
  const findHandlers = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text
      const handler =
        method === 'catch' ? node.arguments[0] : method === 'then' ? node.arguments[1] : null
      if (
        handler &&
        handler.kind !== ts.SyntaxKind.NullKeyword &&
        !(ts.isIdentifier(handler) && handler.text === 'undefined')
      )
        markPromise(node.expression.expression)
    }
    ts.forEachChild(node, findHandlers)
  }
  findHandlers(source)
  const all = new Set(),
    eager = new Set()
  const add = (specifier, atLoad) => {
    if (!specifier || !ts.isStringLiteralLike(specifier)) return
    all.add(specifier.text)
    if (atLoad) eager.add(specifier.text)
  }
  const visit = (node, atLoad) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      add(node.moduleSpecifier, true)
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      add(node.arguments[0], atLoad && !handledDynamic.has(node))
    }
    ts.forEachChild(node, (child) => {
      let childAtLoad = atLoad
      // Function bodies/defaults and instance fields execute only when called.
      if (
        ts.isFunctionLike(node) ||
        (ts.isPropertyDeclaration(node) &&
          !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword))
      )
        childAtLoad = false
      // Preserve legitimate feature checks and missing-module fallbacks.
      if (ts.isIfStatement(node) && child !== node.expression) childAtLoad = false
      if (ts.isConditionalExpression(node) && child !== node.condition) childAtLoad = false
      if (
        ts.isBinaryExpression(node) &&
        child === node.right &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(node.operatorToken.kind)
      )
        childAtLoad = false
      if (ts.isTryStatement(node) && node.catchClause && child !== node.finallyBlock)
        childAtLoad = false
      if (
        (ts.isForStatement(node) ||
          ts.isForInStatement(node) ||
          ts.isForOfStatement(node) ||
          ts.isWhileStatement(node) ||
          ts.isDoStatement(node)) &&
        child === node.statement
      )
        childAtLoad = false
      if (ts.isCaseBlock(node)) childAtLoad = false
      visit(child, childAtLoad)
    })
  }
  visit(source, true)
  return { all, eager }
}
