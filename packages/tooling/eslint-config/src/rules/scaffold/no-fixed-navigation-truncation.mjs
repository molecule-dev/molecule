export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Report a fixed prefix that silently hides items from a rendered navigation collection.',
    },
    schema: [],
    messages: {
      truncated:
        'This navigation renders only the first {{limit}} items. Later destinations become unreachable as the collection grows or changes order. Render the complete collection, provide pagination or expansion, or take an explicit limit from the caller. For an intentional fixed leaderboard, use a reasoned ESLint disable at this slice.',
    },
  },
  create(context) {
    const navigates = (opening) => {
      if (opening.name.type !== 'JSXIdentifier') return false
      const name = opening.name.name
      if (name === 'a' || name === 'area')
        return opening.attributes.some(
          (attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'href',
        )
      let scope = context.sourceCode.getScope(opening)
      while (scope) {
        const variable = scope.set.get(name)
        if (variable)
          return variable.defs.some(
            (definition) =>
              definition.type === 'ImportBinding' &&
              ['react-router', 'react-router-dom', '@molecule/app-routing-react-router'].includes(
                definition.parent.source.value,
              ) &&
              ['Link', 'NavLink'].includes(definition.node.imported?.name),
          )
        scope = scope.upper
      }
      return false
    }
    return {
      CallExpression(node) {
        const map = node.callee
        if (map.type !== 'MemberExpression' || map.computed || map.property.name !== 'map') return
        const slice = map.object
        if (
          slice.type !== 'CallExpression' ||
          slice.callee.type !== 'MemberExpression' ||
          slice.callee.computed ||
          slice.callee.property.name !== 'slice'
        )
          return
        const [start, end] = slice.arguments
        if (
          start?.type !== 'Literal' ||
          start.value !== 0 ||
          end?.type !== 'Literal' ||
          !Number.isInteger(end.value) ||
          end.value <= 0
        )
          return
        let navigation = false
        const visit = (part) => {
          if (!part || typeof part.type !== 'string') return
          if (part.type === 'JSXOpeningElement' && navigates(part)) navigation = true
          for (const key of context.sourceCode.visitorKeys[part.type] ?? []) {
            const value = part[key]
            if (Array.isArray(value)) value.forEach(visit)
            else visit(value)
          }
        }
        visit(node.arguments[0])
        if (navigation)
          context.report({ node: slice, messageId: 'truncated', data: { limit: end.value } })
      },
    }
  },
}
