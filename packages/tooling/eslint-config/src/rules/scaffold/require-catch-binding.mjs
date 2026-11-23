export default {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Require a binding in catch clauses (and, with `rejectionHandlers`, in promise rejection handlers) so the error is never silently swallowed',
    },
    schema: [
      {
        type: 'object',
        properties: { rejectionHandlers: { type: 'boolean' } },
        additionalProperties: false,
      },
    ],
    messages: {
      missing:
        'Bind the caught error: `catch (error)` to log/re-throw it, or `catch (_error)` + a comment for an intentional noop.',
      missingRejection:
        'Bind the rejection: `.catch((error) => …)` to log it, or `.catch((_error) => …)` + a comment for an intentional noop.',
    },
  },
  create(context) {
    const rejectionHandlers = context.options[0]?.rejectionHandlers === true
    return {
      // A rejection handler with no parameter cannot log what it caught. No autofix:
      // inserting `_error` would satisfy the rule without anyone deciding the error is
      // safe to drop.
      CallExpression(node) {
        if (!rejectionHandlers) return
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return
        const method = callee.property.type === 'Identifier' ? callee.property.name : null
        const handler =
          method === 'catch' ? node.arguments[0] : method === 'then' ? node.arguments[1] : null
        if (
          handler &&
          (handler.type === 'ArrowFunctionExpression' || handler.type === 'FunctionExpression') &&
          handler.params.length === 0
        )
          context.report({ node: handler, messageId: 'missingRejection' })
      },
      CatchClause(node) {
        if (node.param) return
        context.report({
          node,
          messageId: 'missing',
          fix(fixer) {
            const source = context.sourceCode
            const names = new Set(
              source.scopeManager.scopes.flatMap((scope) => [
                ...scope.variables.map((variable) => variable.name),
                ...scope.references.map((reference) => reference.identifier.name),
              ]),
            )
            // Scope names include escaped identifiers and references inside closures.
            // Direct eval can read unknown names, so leave it for manual handling.
            if (
              source.scopeManager.scopes.some((scope) =>
                scope.references.some(
                  ({ identifier }) =>
                    identifier.name === 'eval' &&
                    identifier.range[0] >= node.body.range[0] &&
                    identifier.range[1] <= node.body.range[1],
                ),
              )
            )
              return null
            let name = '_error'
            for (let suffix = 1; names.has(name); suffix++) name = `_error${suffix}`
            return fixer.insertTextAfter(source.getFirstToken(node), ` (${name})`)
          },
        })
      },
    }
  },
}
