// A view the page reads from a query parameter that no link sets. X1 P317 l2400 read its
// profile tab with `searchParams.get('tab') === 'favorites'` while the tab link went to
// `/profile/:username/favorites`: the click changed the path, the comparison stayed false,
// and the Favorited tab kept showing the author's own articles (navigation.spec.ts:200).
// Narrow on purpose: one file, a comparison of a `useSearchParams()` read with a string
// literal, nothing in the file that writes that parameter, and a link in the same file whose
// path ends in that same literal. A parameter another file sets, or a view no link names by
// path, stays quiet.
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Report a view read from a query parameter that nothing in the file sets, while a link in the file goes to a path of the same name.',
    },
    schema: [],
    messages: {
      unreachable:
        'This link’s selected state reads `{{read}}` from `?{{key}}=`, while its target on line {{linkLine}} is `{{target}}`. If the target should select this view, align the expression with its path or set `?{{key}}={{value}}` in the link.',
    },
  },
  create(context) {
    const source = context.sourceCode
    const binding = (id) => {
      if (id?.type !== 'Identifier') return null
      for (let scope = source.getScope(id); scope; scope = scope.upper) {
        const found = scope.set.get(id.name)
        if (found) return found
      }
      return null
    }
    const urlFactory = (callee) => {
      const def = binding(callee)?.defs[0]
      return (
        def?.type === 'ImportBinding' &&
        def.parent.importKind !== 'type' &&
        def.node.importKind !== 'type' &&
        ['react-router', 'react-router-dom', '@molecule/app-routing-react-router'].includes(
          def.parent.source.value,
        ) &&
        def.node.imported?.name === 'useSearchParams'
      )
    }

    const text = source.getText()
    const readers = new Set()
    const reads = []
    const links = []
    const literal = (node) =>
      node?.type === 'Literal' && typeof node.value === 'string'
        ? node.value
        : node?.type === 'TemplateLiteral' && node.expressions.length === 0
          ? node.quasis[0].value.cooked
          : null
    // The static tail of a link target: the whole literal, or a template's last piece.
    const targetTail = (node) => {
      if (node?.type === 'JSXExpressionContainer') return targetTail(node.expression)
      if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
      if (node?.type === 'TemplateLiteral') return node.quasis[node.quasis.length - 1].value.cooked
      return null
    }
    return {
      VariableDeclarator(node) {
        if (
          node.id.type === 'ArrayPattern' &&
          node.id.elements[0]?.type === 'Identifier' &&
          node.init?.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          urlFactory(node.init.callee)
        )
          readers.add(binding(node.id.elements[0]))
      },
      BinaryExpression(node) {
        if (!['===', '==', '!==', '!='].includes(node.operator)) return
        for (const [call, other] of [
          [node.left, node.right],
          [node.right, node.left],
        ]) {
          const value = literal(other)
          if (
            value === null ||
            value === '' ||
            call.type !== 'CallExpression' ||
            call.callee.type !== 'MemberExpression' ||
            call.callee.object.type !== 'Identifier' ||
            call.callee.property.type !== 'Identifier' ||
            call.callee.property.name !== 'get'
          )
            continue
          const key = literal(call.arguments[0])
          if (key === null || !/^[A-Za-z_][\w-]*$/.test(key) || !/^[\w-]+$/.test(value)) continue
          reads.push({ node, reader: binding(call.callee.object), key, value })
        }
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || !['to', 'href'].includes(node.name.name)) return
        const tail = targetTail(node.value)
        if (typeof tail === 'string') links.push({ node, tail })
      },
      'Program:exit'() {
        for (const read of reads) {
          if (!readers.has(read.reader)) continue
          // Anything that could write the parameter: `?tab=`, `.set('tab'`, `{ tab: … }`.
          const key = read.key.replace(/[-]/g, '\\$&')
          if (
            new RegExp(
              '[?&`\'"]' +
                key +
                '=|\\.set\\(\\s*[\'"`]' +
                key +
                '[\'"`]|[{,]\\s*[\'"]?' +
                key +
                '[\'"]?\\s*:',
            ).test(text)
          )
            continue
          const owner =
            read.node.parent?.type === 'VariableDeclarator' ? binding(read.node.parent.id) : null
          const selected = (candidate) => {
            for (const attribute of candidate.node.parent?.attributes ?? []) {
              if (
                attribute.type !== 'JSXAttribute' ||
                !['className', 'aria-current', 'aria-selected'].includes(attribute.name.name)
              )
                continue
              const expression = attribute.value?.expression
              let found = false
              const visit = (node) => {
                if (!node) return
                if (
                  node === read.node ||
                  (owner && node.type === 'Identifier' && binding(node) === owner)
                ) {
                  found = true
                  return
                }
                for (const key of source.visitorKeys[node.type] ?? []) {
                  const child = node[key]
                  if (Array.isArray(child)) child.forEach(visit)
                  else visit(child)
                }
              }
              visit(expression)
              if (found) return true
            }
            return false
          }
          const link = links.find(
            (candidate) =>
              new RegExp('/' + read.value + '/?$').test(candidate.tail.split(/[?#]/)[0]) &&
              selected(candidate),
          )
          if (!link) continue
          context.report({
            node: read.node,
            messageId: 'unreachable',
            data: {
              read: source.getText(read.node),
              key: read.key,
              value: read.value,
              linkLine: link.node.loc.start.line,
              target: link.tail,
            },
          })
        }
      },
    }
  },
}
