/**
 * `no-duplicate-list-wrapper`: a status wrapper with no content or identity of its own
 * should not also mount when a sibling with the same tag and classes renders items from
 * the same list.
 *
 * @module
 */

export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      duplicate:
        'This wrapper stays empty when the collection has items and duplicates the list wrapper at line {{line}}. Use one wrapper for both states or render the empty state outside the list.',
    },
  },
  create(context) {
    const unchain = (node) => (node?.type === 'ChainExpression' ? node.expression : node)
    const jsxValue = (node) => (node?.type === 'JSXExpressionContainer' ? node.expression : node)

    /**
     * The dotted spelling of a plain, statically named read, or null. Calls and computed
     * property reads cannot prove that the two siblings share a guard.
     */
    function reference(node) {
      const expression = unchain(node)
      if (expression?.type === 'Identifier') return expression.name
      if (
        expression?.type !== 'MemberExpression' ||
        expression.computed ||
        expression.property.type !== 'Identifier'
      )
        return null
      const owner = reference(expression.object)
      return owner ? `${owner}${expression.optional ? '?.' : '.'}${expression.property.name}` : null
    }

    /** The read whose `name` property this node reads (`items` for `items.length`), or null. */
    function receiver(node, name) {
      const expression = unchain(node)
      return expression?.type === 'MemberExpression' &&
        !expression.computed &&
        expression.property.type === 'Identifier' &&
        expression.property.name === name
        ? reference(expression.object)
        : null
    }

    /** The operands of an `&&` chain, in source order. */
    function andTerms(node) {
      return node.type === 'LogicalExpression' && node.operator === '&&'
        ? [...andTerms(node.left), ...andTerms(node.right)]
        : [node]
    }

    /** The comparable spelling of one guard term (`!open` for a negated read), or null. */
    function guardKey(node) {
      if (node?.type === 'UnaryExpression' && node.operator === '!') {
        const value = reference(node.argument)
        return value && `!${value}`
      }
      return reference(node)
    }

    /** A guarded intrinsic element with one static class list, described for comparison, or null. */
    function wrapper(child) {
      let element = jsxValue(child)
      const guards = []
      while (element.type === 'LogicalExpression' && element.operator === '&&') {
        guards.push(...andTerms(element.left).map(guardKey))
        element = element.right
      }
      if (element.type !== 'JSXElement') return null
      const { name, attributes } = element.openingElement
      if (name.type !== 'JSXIdentifier' || !/^[a-z][a-z0-9]*$/.test(name.name)) return null
      if (attributes.some((attribute) => attribute.type === 'JSXSpreadAttribute')) return null
      const classAttributes = attributes.filter((attribute) => attribute.name.name === 'className')
      if (classAttributes.length !== 1) return null
      const value = jsxValue(classAttributes[0].value)
      if (value?.type !== 'Literal' || typeof value.value !== 'string') return null
      // HTML class tokens are split by ASCII whitespace, including in a JSX string literal.
      const classes = [...new Set(value.value.split(/[\t\n\f\r ]+/).filter(Boolean))]
        .sort()
        .join(' ')
      if (!classes) return null
      const contents = element.children
        .map(jsxValue)
        .filter(
          (node) =>
            node.type !== 'JSXEmptyExpression' && (node.type !== 'JSXText' || node.value.trim()),
        )
      return { element, signature: `${name.name} ${classes}`, attributes, guards, contents }
    }

    /** The collection a `length` check selects an empty-state branch for, or null. */
    function fallbackReceiver(node) {
      if (node?.type !== 'ConditionalExpression') return null
      const isNull = (arm) => arm.type === 'Literal' && arm.value === null
      if (isNull(node.consequent)) return receiver(node.test, 'length')
      if (
        isNull(node.alternate) &&
        node.test.type === 'UnaryExpression' &&
        node.test.operator === '!'
      )
        return receiver(node.test.argument, 'length')
      return null
    }

    /** Report a list wrapper repeated by its own empty-state sibling under the same parent. */
    function checkSiblings(node) {
      if (node.children.length < 2) return
      const wrappers = node.children.map(wrapper).filter(Boolean)
      if (wrappers.length < 2) return
      const lists = wrappers.flatMap((item) => {
        const collections = item.contents
          .map(unchain)
          .map((child) => (child.type === 'CallExpression' ? receiver(child.callee, 'map') : null))
          .filter(Boolean)
        return collections.length ? [{ ...item, collections }] : []
      })
      for (const fallback of wrappers) {
        if (fallback.attributes.length !== 1 || fallback.contents.length !== 1) continue
        const collection = fallbackReceiver(fallback.contents[0])
        if (!collection) continue
        const list = lists.find(
          (item) =>
            item.signature === fallback.signature &&
            item.collections.includes(collection) &&
            fallback.guards.every((guard, index) => guard && guard === item.guards[index]),
        )
        if (list) {
          context.report({
            node: fallback.element.openingElement,
            messageId: 'duplicate',
            data: { line: list.element.loc.start.line },
          })
        }
      }
    }

    return { JSXElement: checkSiblings, JSXFragment: checkSiblings }
  },
}
