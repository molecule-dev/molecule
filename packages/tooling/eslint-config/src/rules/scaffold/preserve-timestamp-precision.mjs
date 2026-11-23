export default {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: { fields: { type: 'array', items: { type: 'string' } } },
        required: ['fields'],
        additionalProperties: false,
      },
    ],
    messages: {
      truncated:
        'This toISOString() value is truncated in the configured precision-sensitive field {{field}}. Keep its full ISO value; use a separate formatted value for display.',
    },
  },
  create(context) {
    const fields = new Set(context.options[0]?.fields ?? [])
    return {
      CallExpression(node) {
        const member = node.callee
        if (
          member.type !== 'MemberExpression' ||
          !['slice', 'substring', 'substr'].includes(member.property.name) ||
          node.arguments[0]?.value !== 0 ||
          typeof node.arguments[1]?.value !== 'number' ||
          node.arguments[1].value < 19 ||
          node.arguments[1]?.value >= 24
        )
          return
        const call = member.object
        if (
          call.type !== 'CallExpression' ||
          call.callee.type !== 'MemberExpression' ||
          call.callee.property.name !== 'toISOString'
        )
          return
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (parent.type === 'Property') {
            if (parent.computed && parent.key.type !== 'Literal') return
            const field = parent.computed ? parent.key.value : (parent.key.name ?? parent.key.value)
            if (fields.has(field)) context.report({ node, messageId: 'truncated', data: { field } })
            return
          }
          if (
            ['VariableDeclarator', 'ReturnStatement', 'ExpressionStatement'].includes(parent.type)
          )
            return
        }
      },
    }
  },
}
