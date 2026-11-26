/**
 * Reject an assertion that uses `unknown` as an intermediate type to bypass compatibility checks.
 *
 * @module
 */

/**
 * The rule shared by all TypeScript source formats in the repo config.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow consecutive assertions through unknown' },
    schema: [],
    messages: {
      doubleCast:
        'Avoid consecutive casts through unknown. Accept only the fields you use, use the SDK type or generic, narrow with a type guard, or declare the global or module.',
    },
  },
  create(context) {
    return {
      ':matches(TSAsExpression, TSTypeAssertion)[expression.typeAnnotation.type="TSUnknownKeyword"]:matches([expression.type="TSAsExpression"], [expression.type="TSTypeAssertion"])'(
        node,
      ) {
        context.report({ node, messageId: 'doubleCast' })
      },
    }
  },
}

export default rule
