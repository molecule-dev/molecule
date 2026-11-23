// A nullable validator may accept omission (undefined) and reject invalid input (null).
// A falsy guard combines those outcomes and silently abandons the HTTP request.
export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      unanswered:
        '{{helper}} can return undefined without sending a response. This bare return abandons the HTTP request. If null is the invalid-input sentinel, compare {{value}} === null; otherwise send a response or call next before returning.',
    },
  },
  create(context) {
    const source = context.sourceCode
    const binding = (node) => {
      for (let scope = source.getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(node.name)
        if (variable) return variable.defs[0]?.node
      }
      return null
    }
    const bare = (node) => node?.type === 'ReturnStatement' && !node.argument
    const unwrap = (node) =>
      node?.type === 'BlockStatement' && node.body.length === 1 ? node.body[0] : node
    const identifierUsed = (node, name) => {
      if (!node) return false
      if (node.type === 'Identifier' && node.name === name) return true
      return (source.visitorKeys[node.type] ?? []).some((key) => {
        const value = node[key]
        return Array.isArray(value)
          ? value.some((part) => identifierUsed(part, name))
          : identifierUsed(value, name)
      })
    }
    return {
      IfStatement(node) {
        if (
          node.test.type !== 'UnaryExpression' ||
          node.test.operator !== '!' ||
          node.test.argument.type !== 'Identifier' ||
          !bare(unwrap(node.consequent))
        )
          return
        const value = node.test.argument
        const declaration = binding(value)
        if (
          declaration?.type !== 'VariableDeclarator' ||
          declaration.parent.kind !== 'const' ||
          declaration.init?.type !== 'CallExpression'
        )
          return
        const call = declaration.init
        if (call.callee.type !== 'Identifier') return
        const definition = binding(call.callee)
        const helper = definition?.type === 'VariableDeclarator' ? definition.init : definition
        if (
          !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
            helper?.type,
          )
        )
          return
        const union = helper.returnType?.typeAnnotation
        if (
          union?.type !== 'TSUnionType' ||
          !union.types.some((type) => type.type === 'TSUndefinedKeyword') ||
          !union.types.some(
            (type) =>
              type.type === 'TSNullKeyword' ||
              (type.type === 'TSLiteralType' && type.literal.value === null),
          )
        )
          return
        let handler = node.parent
        while (
          handler &&
          !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
            handler.type,
          )
        )
          handler = handler.parent
        const route = handler?.parent
        if (
          route?.type !== 'CallExpression' ||
          route.callee.type !== 'MemberExpression' ||
          !['get', 'post', 'put', 'patch', 'delete', 'all'].includes(route.callee.property.name)
        )
          return
        const response = handler.params[1]
        if (response?.type !== 'Identifier') return
        // An unconditional earlier send already completed this route's response.
        const guardAt =
          handler.body?.body?.findIndex(
            (statement) =>
              statement.range[0] <= node.range[0] && node.range[1] <= statement.range[1],
          ) ?? -1
        const answered =
          guardAt >= 0 &&
          handler.body.body.slice(0, guardAt).some((statement) => {
            const expression =
              statement.type === 'ExpressionStatement' ? statement.expression : null
            if (
              expression?.type !== 'CallExpression' ||
              expression.callee.type !== 'MemberExpression' ||
              !['json', 'send', 'end', 'sendStatus', 'redirect'].includes(
                expression.callee.property.name,
              )
            )
              return false
            let receiver = expression.callee.object
            while (
              receiver?.type === 'CallExpression' &&
              receiver.callee.type === 'MemberExpression'
            )
              receiver = receiver.callee.object
            return receiver?.type === 'Identifier' && receiver.name === response.name
          })
        if (answered) return
        const responseIndex = call.arguments.findIndex(
          (arg) => arg.type === 'Identifier' && arg.name === response.name,
        )
        const helperResponse = helper.params[responseIndex]
        if (helperResponse?.type !== 'Identifier' || helper.body?.type !== 'BlockStatement') return
        // Prove an early undefined path does not touch the response. Unknown calls or
        // more complex control flow stay unverified; no fix is applied automatically.
        let omitted = false
        for (const statement of helper.body.body) {
          if (identifierUsed(statement, helperResponse.name)) break
          if (statement.type !== 'IfStatement') continue
          const returned = unwrap(statement.consequent)
          if (
            returned?.type === 'ReturnStatement' &&
            returned.argument?.type === 'Identifier' &&
            returned.argument.name === 'undefined' &&
            !binding(returned.argument)
          )
            omitted = true
        }
        if (omitted)
          context.report({
            node,
            messageId: 'unanswered',
            data: { helper: call.callee.name, value: value.name },
          })
      },
    }
  },
}
