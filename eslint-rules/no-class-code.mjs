/**
 * CANONICAL static class-list check; sync with scripts/sync-eslint-rules.mjs.
 * JavaScript punctuation or quoted class names in a class string usually means a lost
 * template interpolation. This checks literal class values, never application selectors.
 */
const KEYS = new Set(['class', 'className'])
const TOKENS = new Set(['$', '?', ':', '{', '}'])
const key = (node) => node?.name ?? node?.value

export default {
  meta: {
    type: 'problem',
    schema: [],
    docs: { description: 'Catch JavaScript accidentally rendered as static CSS classes.' },
    messages: {
      code: 'This static class list contains JavaScript token {{token}}. Restore the ${...} interpolation or pass a conditional class expression; JavaScript inside a string is rendered as class text.',
    },
  },
  create(context) {
    const reported = new WeakSet()
    const text = (node, value) => {
      if (reported.has(node)) return
      const token = value.split(/\s+/).find((part) => TOKENS.has(part) || /^(['"]).+\1$/.test(part))
      if (token) {
        reported.add(node)
        context.report({ node, messageId: 'code', data: { token: JSON.stringify(token) } })
      }
    }
    const strings = (node) => {
      if (!node) return
      switch (node.type) {
        case 'JSXExpressionContainer':
          strings(node.expression)
          break
        case 'Literal':
          if (typeof node.value === 'string') text(node, node.value)
          break
        case 'TemplateLiteral':
          for (const part of node.quasis) text(part, part.value.cooked ?? part.value.raw)
          break
        case 'ConditionalExpression':
          strings(node.consequent)
          strings(node.alternate)
          break
        case 'LogicalExpression':
          if (node.operator !== '&&') strings(node.left)
          strings(node.right)
          break
        case 'ArrayExpression':
          for (const part of node.elements) strings(part)
          break
        case 'TSAsExpression':
        case 'TSSatisfiesExpression':
        case 'TSNonNullExpression':
          strings(node.expression)
          break
      }
    }
    return {
      JSXAttribute(node) {
        if (KEYS.has(key(node.name))) strings(node.value)
      },
      Property(node) {
        if (KEYS.has(key(node.key))) strings(node.value)
      },
      CallExpression(node) {
        const callee = node.callee
        if (
          callee.type === 'Identifier' &&
          ['cn', 'clsx', 'classNames', 'classnames'].includes(callee.name)
        )
          node.arguments.forEach(strings)
        if (callee.type !== 'MemberExpression') return
        const method = key(callee.property)
        if (
          method === 'cn' ||
          (['add', 'remove', 'replace', 'toggle'].includes(method) &&
            key(callee.object?.property) === 'classList')
        )
          node.arguments.forEach(strings)
        if (method === 'setAttribute' && KEYS.has(node.arguments[0]?.value))
          strings(node.arguments[1])
      },
    }
  },
}
