/**
 * molecule-only rule (Solid ports): a `ResolveNode` or `PresentWhileNode` callback returns JSX, and
 * reads the accessors it receives only inside JSX or a function it creates.
 *
 * The callback of `@molecule/app-solid`'s `ResolveNode` and `PresentWhileNode` runs once each time
 * it is shown, like a component body, untracked. What it reads itself is read once: the callback
 * returns that first value, and when what the node renders changes later (a row whose root is a
 * fragment or a `<Show>`, a slot whose content becomes conditional) or a prop it branches on
 * changes, the change is never inserted. `(node) => node()` is the shape (2026-11-24: ShowMore's
 * rows kept their first output after their root changed), and so is
 * `(actions) => (props.onClick ? <div>{actions()}</div> : actions())`. Inside JSX the compiler reads
 * an expression in an effect, so `(node) => <>{node()}</>` follows every change.
 *
 * So the rule reports:
 *
 * - a returned value that is not JSX (an element or fragment) or the accessor itself
 *   (`(node) => node`, which the parent inserts and reads): it fixes an expression body by
 *   returning it inside a fragment;
 * - an accessor read (`node()`, `present()`, an enclosing callback's included) in a statement of a
 *   block body, outside JSX and outside a function the callback creates (an event handler, a
 *   `() => node()` passed on, which reads when it is called).
 */

/** The components of `@molecule/app-solid` whose children callback receives node accessors. */
const RESOLVERS = new Set(['ResolveNode', 'PresentWhileNode'])

/** Node types that create a function: what is read inside one is read when it is called. */
const FUNCTIONS = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'])

/**
 * The rule.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'A ResolveNode or PresentWhileNode callback returns JSX and reads its accessors inside it: the callback runs once, so a value it reads itself never updates',
    },
    messages: {
      notJsx:
        'A {{component}} callback runs once, so the value it returns is read once: when a node or a prop it reads changes, the change is never shown (a row whose root renders something else later keeps its first output). Return it inside JSX, where it is read in an effect (`<>{…}</>`), or return the accessor itself (`(node) => node`), which the parent inserts and reads.',
      once: '`{{call}}` is read once: a {{component}} callback runs once, so an accessor read in its own statements never updates. Read it inside the JSX it returns, or inside a function (`const label = () => {{call}}`).',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode
    /** Each callback a resolver component receives, with its component's name and its params. */
    const callbacks = new Map()

    /**
     * Records a callback a resolver component receives, and checks an expression body.
     *
     * @param {string} component - The component's name.
     * @param {import('estree').Node | null | undefined} value - The children value.
     */
    function register(component, value) {
      if (value?.type !== 'ArrowFunctionExpression' && value?.type !== 'FunctionExpression') return
      const params = new Set(
        value.params.filter((param) => param.type === 'Identifier').map((param) => param.name),
      )
      callbacks.set(value, { component, params })
      if (value.body.type !== 'BlockStatement') checkReturned(value.body, value, component)
    }

    /**
     * Reports a returned value that is neither JSX nor the callback's own accessor.
     *
     * @param {import('estree').Node} returned - The returned expression.
     * @param {import('estree').Node} callback - The callback.
     * @param {string} component - The resolver component's name.
     */
    function checkReturned(returned, callback, component) {
      if (returned.type === 'JSXElement' || returned.type === 'JSXFragment') return
      if (returned.type === 'Identifier' && callbacks.get(callback)?.params.has(returned.name))
        return
      context.report({
        node: returned,
        messageId: 'notJsx',
        data: { component },
        fix: (fixer) => fixer.replaceText(returned, `<>{${sourceCode.getText(returned)}}</>`),
      })
    }

    return {
      JSXElement(node) {
        const name = node.openingElement.name
        if (name.type !== 'JSXIdentifier' || !RESOLVERS.has(name.name)) return
        for (const child of node.children)
          if (child.type === 'JSXExpressionContainer') register(name.name, child.expression)
        for (const attribute of node.openingElement.attributes)
          if (
            attribute.type === 'JSXAttribute' &&
            attribute.name.type === 'JSXIdentifier' &&
            attribute.name.name === 'children' &&
            attribute.value?.type === 'JSXExpressionContainer'
          )
            register(name.name, attribute.value.expression)
      },
      ReturnStatement(node) {
        if (!node.argument) return
        const ancestors = sourceCode.getAncestors(node)
        for (let index = ancestors.length - 1; index >= 0; index -= 1) {
          const ancestor = ancestors[index]
          if (!FUNCTIONS.has(ancestor.type)) continue
          const callback = callbacks.get(ancestor)
          if (callback) checkReturned(node.argument, ancestor, callback.component)
          return
        }
      },
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.arguments.length > 0) return
        const ancestors = sourceCode.getAncestors(node)
        for (let index = ancestors.length - 1; index >= 0; index -= 1) {
          const ancestor = ancestors[index]
          // Inside JSX the compiler reads it in an effect.
          if (ancestor.type === 'JSXExpressionContainer' || ancestor.type === 'JSXSpreadAttribute')
            return
          // A returned value is checked as a whole (`notJsx`).
          if (ancestor.type === 'ReturnStatement') return
          const callback = callbacks.get(ancestor)
          if (callback) {
            if (ancestor.body.type !== 'BlockStatement') return
            // Its own accessors, and those of every callback around it, are read once here.
            const enclosing = ancestors.slice(0, index + 1).flatMap((outer) => {
              const found = callbacks.get(outer)
              return found ? [...found.params] : []
            })
            if (enclosing.includes(node.callee.name))
              context.report({
                node,
                messageId: 'once',
                data: { call: sourceCode.getText(node), component: callback.component },
              })
            return
          }
          if (FUNCTIONS.has(ancestor.type)) return
        }
      },
    }
  },
}

export default rule
