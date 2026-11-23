import { componentResolver } from './component-resolver.mjs'

/**
 * HTML paragraphs accept phrasing content. Resolve local component roots too: a markdown
 * renderer returning a div must not be hidden behind a component name inside a p.
 *
 * @param parser - The parser that reads the components this file imports.
 * @returns The rule.
 */
export default function noBlockInParagraph(parser) {
  return {
    meta: {
      type: 'problem',
      schema: [],
      messages: {
        block:
          '<p> at line {{line}} contains <{{tag}}> through {{component}}. Paragraphs cannot contain block elements; use a <div> for the outer wrapper because browsers close a paragraph before block content.',
      },
    },
    create(context) {
      const block = new Set([
        'address',
        'article',
        'aside',
        'blockquote',
        'details',
        'div',
        'dl',
        'fieldset',
        'figcaption',
        'figure',
        'footer',
        'form',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'header',
        'hgroup',
        'hr',
        'main',
        'menu',
        'nav',
        'ol',
        'p',
        'pre',
        'search',
        'section',
        'table',
        'ul',
      ])
      const { scopes, unwrap, imported, roots } = componentResolver(parser, context)
      const find = (node, tree, filename, seen = new Set(), rootOnly = false) => {
        node = unwrap(node)
        if (!node || seen.has(node) || seen.size >= 24) return null
        seen = new Set(seen).add(node)
        if (node.type === 'JSXElement' || node.type === 'JSXSelfClosingElement') {
          const open = node.openingElement ?? node
          const name = open.name.type === 'JSXIdentifier' ? open.name.name : ''
          if (block.has(name)) return { tag: name, component: name }
          if (['template', 'svg', 'math'].includes(name)) return null
          if (/^[A-Z]/.test(name)) {
            const containing = (scopes.get(tree) ?? [])
              .filter(
                (scope) =>
                  scope.block.range &&
                  scope.block.range[0] <= open.range[0] &&
                  scope.block.range[1] >= open.range[1],
              )
              .sort(
                (a, b) =>
                  a.block.range[1] - a.block.range[0] - (b.block.range[1] - b.block.range[0]),
              )
            let scope = containing[0],
              binding = null
            while (scope && !binding) {
              binding = scope.variables.find((variable) => variable.name === name)
              scope = scope.upper
            }
            const def = binding?.defs[0]
            const local =
              def?.type === 'FunctionName'
                ? def.node
                : def?.type === 'Variable'
                  ? unwrap(def.node.init)
                  : null
            const target = local
              ? { node: local, tree, filename }
              : def?.type === 'ImportBinding'
                ? imported(tree, name, filename)
                : null
            const returns = target ? roots(target.node) : []
            if (returns.length === 1)
              for (const root of returns) {
                const found = find(root, target.tree, target.filename, seen, true)
                if (found) return { ...found, component: name }
              }
            // Opaque components may discard their children. Never infer that they render them.
            return null
          }
          if (rootOnly) return null
          for (const child of node.children ?? []) {
            const found = find(child, tree, filename, seen)
            if (found) return found
          }
        } else if (node.type === 'JSXFragment') {
          for (const child of node.children) {
            const found = find(child, tree, filename, seen, rootOnly)
            if (found) return found
          }
        } else if (node.type === 'JSXExpressionContainer')
          return find(node.expression, tree, filename, seen)
        else if (node.type === 'ConditionalExpression') {
          if (rootOnly) return null
          const test = unwrap(node.test)
          if (test.type === 'Literal')
            return find(test.value ? node.consequent : node.alternate, tree, filename, seen)
          return (
            find(node.consequent, tree, filename, seen) ??
            find(node.alternate, tree, filename, seen)
          )
        } else if (node.type === 'LogicalExpression') {
          if (rootOnly) return null
          const left = unwrap(node.left)
          if (left.type === 'Literal') {
            const right =
              node.operator === '&&'
                ? Boolean(left.value)
                : node.operator === '||'
                  ? !left.value
                  : left.value === null
            return find(right ? node.right : node.left, tree, filename, seen)
          }
          return find(node.left, tree, filename, seen) ?? find(node.right, tree, filename, seen)
        }
        return null
      }
      return {
        JSXElement(node) {
          if (
            node.openingElement.name.type !== 'JSXIdentifier' ||
            node.openingElement.name.name !== 'p'
          )
            return
          for (const child of node.children) {
            const found = find(child, context.sourceCode.ast, context.filename)
            if (found) {
              context.report({
                node: node.openingElement,
                messageId: 'block',
                data: { ...found, line: node.loc.start.line },
              })
              break
            }
          }
        },
      }
    },
  }
}
