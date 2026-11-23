import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { URL } from 'node:url'

/**
 * Reads the components a file renders from their own modules: each relative import is parsed once
 * per linted file with the scaffold parser, and `roots` lists the expressions a component function
 * returns. Shared by the scaffold rules that must see through an imported component.
 *
 * @param parser - The parser the scaffold lints with (typescript-eslint).
 * @param context - The rule context of the file being linted.
 * @returns Resolution helpers sharing one parse cache for this file.
 */
export function componentResolver(parser, context) {
  const cache = new Map()
  const scopes = new WeakMap([[context.sourceCode.ast, context.sourceCode.scopeManager.scopes]])
  const unwrap = (node) =>
    ['TSAsExpression', 'TSNonNullExpression', 'ParenthesizedExpression'].includes(node?.type)
      ? unwrap(node.expression)
      : node
  const declaration = (tree, name) => {
    for (const statement of tree.body) {
      const node = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
      if (!node) continue
      if (node.type === 'FunctionDeclaration' && node.id?.name === name) return node
      if (node.type === 'VariableDeclaration') {
        const found = node.declarations.find(
          (item) => item.id.type === 'Identifier' && item.id.name === name,
        )
        if (found) return unwrap(found.init)
      }
    }
    return null
  }
  const imported = (tree, name, filename) => {
    const statement = tree.body.find(
      (node) =>
        node.type === 'ImportDeclaration' &&
        node.specifiers.some((item) => item.local.name === name),
    )
    if (!statement || statement.importKind === 'type' || !statement.source.value.startsWith('.'))
      return null
    const spec = statement.specifiers.find((item) => item.local.name === name)
    if (spec.importKind === 'type') return null
    const stem = new URL(statement.source.value, `file://${filename}`).pathname
    const paths = [
      stem,
      ...['.tsx', '.ts', '.jsx', '.js'].map((ext) => stem.replace(/\.[cm]?jsx?$/, '') + ext),
      stem + '/index.tsx',
    ]
    for (const file of paths) {
      let source = cache.get(file)
      if (source === undefined) {
        try {
          const parsed = parser.parseForESLint(readFileSync(file, 'utf8'), {
            filePath: file,
            tsconfigRootDir: dirname(file),
            ecmaFeatures: { jsx: true },
            sourceType: 'module',
            loc: true,
            range: true,
          })
          source = parsed.ast
          scopes.set(source, parsed.scopeManager.scopes)
        } catch (_error) {
          source = null
        }
        cache.set(file, source)
      }
      if (!source) continue
      const name = spec.type === 'ImportDefaultSpecifier' ? 'default' : spec.imported?.name
      const exported =
        name === 'default'
          ? source.body.find((node) => node.type === 'ExportDefaultDeclaration')?.declaration
          : declaration(source, name)
      return exported ? { node: exported, tree: source, filename: file } : null
    }
    return null
  }
  const roots = (node) => {
    if (node?.type === 'Identifier') return []
    if (
      ['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(node?.type)
    ) {
      if (node.body.type !== 'BlockStatement') return [node.body]
      const result = []
      const visit = (part) => {
        if (
          !part ||
          ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
            part.type,
          )
        )
          return
        if (part.type === 'ReturnStatement') {
          if (part.argument) result.push(part.argument)
          return
        }
        for (const [key, value] of Object.entries(part)) {
          if (['parent', 'tokens', 'comments', 'loc', 'range'].includes(key)) continue
          if (Array.isArray(value)) for (const item of value) visit(item)
          else if (value && typeof value === 'object') visit(value)
        }
      }
      visit(node.body)
      return result
    }
    return []
  }
  return { scopes, unwrap, imported, roots, declaration }
}
